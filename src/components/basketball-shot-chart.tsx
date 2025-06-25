import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const BasketballShotChart = () => {
  const mountRef = useRef(null);
  const sceneRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    court: null,
    shotGroup: null,
    cameraAngle: 0
  });

  const [shotData, setShotData] = useState('');
  const [trajectoryHeight, setTrajectoryHeight] = useState(12);
  const [viewAngle, setViewAngle] = useState('side');
  const [showCourt, setShowCourt] = useState(true);
  const [animateShots, setAnimateShots] = useState(false);
  const [showTrajectories, setShowTrajectories] = useState(true);
  const [showUI, setShowUI] = useState(true);
  const [stats, setStats] = useState({
    totalShots: 0,
    madeShots: 0,
    shootingPct: 0,
    avgDistance: 0
  });

  useEffect(() => {
    if (!mountRef.current) return;

    const { scene, camera, renderer, court, shotGroup } = initializeScene();
    sceneRef.current = { scene, camera, renderer, court, shotGroup, cameraAngle: 0 };

    const animate = () => {
      requestAnimationFrame(animate);
      
      // Animate glow effects
      if (shotGroup) {
        shotGroup.children.forEach((shot, index) => {
          const glow = shot.children[2];
          if (glow) {
            glow.material.opacity = 0.2 + 0.1 * Math.sin(Date.now() * 0.003 + index);
          }
        });
      }
      
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (sceneRef.current.court) {
      sceneRef.current.court.visible = showCourt;
    }
  }, [showCourt]);

  useEffect(() => {
    setCameraAngle(viewAngle);
  }, [viewAngle]);

  useEffect(() => {
    updateVisualization();
  }, [trajectoryHeight, showTrajectories]);

  const initializeScene = () => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x001122);
    scene.fog = new THREE.Fog(0x001122, 50, 200);

    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    setCameraAngleInternal(camera, 'side');

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const spotLight = new THREE.SpotLight(0xffd700, 0.5);
    spotLight.position.set(0, 30, 4.25);
    spotLight.target.position.set(0, 0, 4.25);
    scene.add(spotLight);
    scene.add(spotLight.target);

    const court = createCourt();
    scene.add(court);

    const shotGroup = new THREE.Group();
    scene.add(shotGroup);

    addMouseControls(renderer, camera);

    return { scene, camera, renderer, court, shotGroup };
  };

  const createCourt = () => {
    const court = new THREE.Group();

    // Court floor
    const courtGeometry = new THREE.PlaneGeometry(50, 47);
    const courtTexture = createCourtTexture();
    const courtMaterial = new THREE.MeshLambertMaterial({ map: courtTexture });
    const courtMesh = new THREE.Mesh(courtGeometry, courtMaterial);
    courtMesh.rotation.x = -Math.PI / 2;
    courtMesh.position.z = 23.5;
    courtMesh.receiveShadow = true;
    court.add(courtMesh);

    createBasket(court);
    createCourtLines(court);

    return court;
  };

  const createCourtTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#CD853F';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    
    // Half-court center circle
    ctx.beginPath();
    ctx.arc(256, 480, 60, Math.PI, 2 * Math.PI);
    ctx.stroke();

    // Three-point arc
    ctx.beginPath();
    ctx.arc(256, 30, 130, 0.15, Math.PI - 0.15);
    ctx.stroke();

    // Three-point line straight sections
    ctx.beginPath();
    ctx.moveTo(126, 30);
    ctx.lineTo(126, 170);
    ctx.moveTo(386, 30);
    ctx.lineTo(386, 170);
    ctx.stroke();

    // Free throw circle
    ctx.beginPath();
    ctx.arc(256, 200, 60, 0, 2 * Math.PI);
    ctx.stroke();

    // Free throw lane
    ctx.strokeRect(192, 30, 128, 190);

    // Free throw line
    ctx.beginPath();
    ctx.moveTo(192, 200);
    ctx.lineTo(320, 200);
    ctx.stroke();

    // Baseline
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 30);
    ctx.lineTo(512, 30);
    ctx.stroke();

    return new THREE.CanvasTexture(canvas);
  };

  const createBasket = (court) => {
    // Backboard
    const backboardGeometry = new THREE.BoxGeometry(6, 3.5, 0.5);
    const backboardMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const backboard = new THREE.Mesh(backboardGeometry, backboardMaterial);
    backboard.position.set(0, 12, 0.25);
    court.add(backboard);

    // Support pole
    const poleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 12);
    const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.set(0, 6, -2);
    court.add(pole);

    // Rim support arm
    const armGeometry = new THREE.BoxGeometry(0.3, 0.2, 4.5);
    const armMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
    const arm = new THREE.Mesh(armGeometry, armMaterial);
    arm.position.set(0, 10, 2);
    court.add(arm);

    // Rim
    const rimGeometry = new THREE.TorusGeometry(0.75, 0.1, 8, 16);
    const rimMaterial = new THREE.MeshLambertMaterial({ color: 0xff4500 });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.position.set(0, 10, 4.25);
    rim.rotation.x = Math.PI / 2;
    court.add(rim);

    // Net
    createNet(court);
  };

  const createNet = (court) => {
    const netGroup = new THREE.Group();
    const netMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xffffff, 
      transparent: true, 
      opacity: 0.8 
    });

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const x = Math.cos(angle) * 0.75;
      const z = Math.sin(angle) * 0.75;

      const strandGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1.5);
      const strand = new THREE.Mesh(strandGeometry, netMaterial);
      strand.position.set(x, 9.25, 4.25 + z);
      netGroup.add(strand);
    }

    court.add(netGroup);
  };

  const createCourtLines = (court) => {
    // Three-point line arc
    const threePointCurve = new THREE.EllipseCurve(0, 4.25, 20, 20, 0.35, Math.PI - 0.35);
    const threePointPoints = threePointCurve.getPoints(50);
    const threePointGeometry = new THREE.BufferGeometry().setFromPoints(threePointPoints);
    const threePointLine = new THREE.Line(
      threePointGeometry, 
      new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 })
    );
    threePointLine.rotation.x = -Math.PI / 2;
    threePointLine.position.y = 0.02;
    court.add(threePointLine);

    // Three-point line straight sections
    const leftLine = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-12, 0, 4.25),
      new THREE.Vector3(-12, 0, 14)
    ]);
    const rightLine = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(12, 0, 4.25),
      new THREE.Vector3(12, 0, 14)
    ]);

    const leftThreePoint = new THREE.Line(leftLine, new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 }));
    const rightThreePoint = new THREE.Line(rightLine, new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 }));
    leftThreePoint.position.y = 0.02;
    rightThreePoint.position.y = 0.02;
    court.add(leftThreePoint);
    court.add(rightThreePoint);
  };

  const createShotVisualization = (shot, index) => {
    const shotGroup = new THREE.Group();

    // Shot marker
    const markerGeometry = new THREE.SphereGeometry(0.3);
    const markerMaterial = new THREE.MeshLambertMaterial({
      color: shot.made ? 0x00ff00 : 0xff0000,
      emissive: shot.made ? 0x002200 : 0x220000
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.set(shot.x, 0.5, shot.y);
    marker.castShadow = true;
    shotGroup.add(marker);

    // Trajectory
    if (showTrajectories) {
      const trajectory = createTrajectory(shot.x, shot.y, shot.made);
      shotGroup.add(trajectory);
    }

    // Glow effect
    const glowGeometry = new THREE.SphereGeometry(0.5);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: shot.made ? 0x00ff00 : 0xff0000,
      transparent: true,
      opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.set(shot.x, 0.5, shot.y);
    shotGroup.add(glow);

    return shotGroup;
  };

  const createTrajectory = (x, y, made) => {
    const basketX = 0;
    const basketY = 4.25;

    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(x, 0.5, y),
      new THREE.Vector3((x + basketX) / 2, trajectoryHeight, (y + basketY) / 2),
      new THREE.Vector3(basketX, 10, basketY)
    );

    const points = curve.getPoints(50);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: made ? 0x00aa00 : 0xaa0000,
      transparent: true,
      opacity: 0.7,
      linewidth: 3
    });

    return new THREE.Line(geometry, material);
  };

  const setCameraAngleInternal = (camera, angle) => {
    switch(angle) {
      case 'overhead':
        camera.position.set(0, 60, 23.5);
        camera.lookAt(0, 0, 23.5);
        break;
      case 'side':
        camera.position.set(40, 25, 23.5);
        camera.lookAt(0, 5, 15);
        break;
      case 'corner':
        camera.position.set(30, 20, 5);
        camera.lookAt(0, 5, 15);
        break;
      case 'broadcast':
        camera.position.set(15, 35, -10);
        camera.lookAt(0, 10, 4);
        break;
    }
  };

  const setCameraAngle = (angle) => {
    if (sceneRef.current.camera) {
      setCameraAngleInternal(sceneRef.current.camera, angle);
    }
  };

  const addMouseControls = (renderer, camera) => {
    let isMouseDown = false;
    let mouseX = 0, mouseY = 0;

    const onMouseDown = (e) => {
      isMouseDown = true;
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const onMouseMove = (e) => {
      if (!isMouseDown) return;

      const deltaX = e.clientX - mouseX;
      sceneRef.current.cameraAngle += deltaX * 0.01;
      const radius = 50;
      camera.position.x = Math.cos(sceneRef.current.cameraAngle) * radius;
      camera.position.z = Math.sin(sceneRef.current.cameraAngle) * radius + 25;
      camera.lookAt(0, 5, 15);

      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const onMouseUp = () => {
      isMouseDown = false;
    };

    const onWheel = (e) => {
      const zoom = e.deltaY * 0.01;
      camera.position.multiplyScalar(1 + zoom);
      camera.lookAt(0, 5, 15);
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel);
  };

  const updateVisualization = () => {
    if (!sceneRef.current.shotGroup) return;

    try {
      const shots = shotData ? JSON.parse(shotData) : [];
      sceneRef.current.shotGroup.clear();

      if (animateShots) {
        animateShotsSequentially(shots);
      } else {
        shots.forEach((shot, index) => {
          const shotViz = createShotVisualization(shot, index);
          sceneRef.current.shotGroup.add(shotViz);
        });
      }

      updateStats(shots);
    } catch (error) {
      console.error('Invalid JSON data:', error);
    }
  };

  const animateShotsSequentially = (shots) => {
    let currentShot = 0;

    const addNextShot = () => {
      if (currentShot < shots.length) {
        const shotViz = createShotVisualization(shots[currentShot], currentShot);
        sceneRef.current.shotGroup.add(shotViz);
        currentShot++;
        setTimeout(addNextShot, 300);
      }
    };

    addNextShot();
  };

  const generateRandomData = () => {
    const sampleShots = [];
    const numShots = 20;

    for (let i = 0; i < numShots; i++) {
      const x = (Math.random() - 0.5) * 40;
      const y = Math.random() * 43 + 4.25;
      const distance = Math.sqrt(x * x + (y - 4.25) * (y - 4.25));
      const shootingPct = Math.max(0.25, 0.75 - (distance / 30));
      const made = Math.random() < shootingPct;

      sampleShots.push({
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        made: made
      });
    }

    setShotData(JSON.stringify(sampleShots, null, 2));
    setTimeout(updateVisualization, 100);
  };

  const updateStats = (shots) => {
    const totalShots = shots.length;
    const madeShots = shots.filter(shot => shot.made).length;
    const shootingPct = totalShots > 0 ? ((madeShots / totalShots) * 100).toFixed(1) : 0;

    let avgDistance = 0;
    if (totalShots > 0) {
      const totalDistance = shots.reduce((sum, shot) => {
        return sum + Math.sqrt(shot.x * shot.x + (shot.y - 4.25) * (shot.y - 4.25));
      }, 0);
      avgDistance = (totalDistance / totalShots).toFixed(1);
    }

    setStats({
      totalShots,
      madeShots,
      shootingPct: parseFloat(shootingPct),
      avgDistance: parseFloat(avgDistance)
    });
  };

  const clearChart = () => {
    setShotData('');
    if (sceneRef.current.shotGroup) {
      sceneRef.current.shotGroup.clear();
    }
    setStats({ totalShots: 0, madeShots: 0, shootingPct: 0, avgDistance: 0 });
  };

  const rotateCamera = () => {
    sceneRef.current.cameraAngle += Math.PI / 4;
    const radius = 50;
    sceneRef.current.camera.position.x = Math.cos(sceneRef.current.cameraAngle) * radius;
    sceneRef.current.camera.position.z = Math.sin(sceneRef.current.cameraAngle) * radius + 23.5;
    sceneRef.current.camera.lookAt(0, 5, 15);
  };

  const resetCamera = () => {
    setCameraAngle(viewAngle);
    sceneRef.current.cameraAngle = 0;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a, #1a1a2e, #16213e)',
      color: 'white',
      overflow: 'hidden',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Toggle UI Button */}
      <button
        onClick={() => setShowUI(!showUI)}
        style={{
          position: 'absolute',
          top: '20px',
          left: '350px',
          zIndex: 101,
          background: 'rgba(0,0,0,0.8)',
          border: 'none',
          color: 'white',
          padding: '10px',
          borderRadius: '50%',
          cursor: 'pointer',
          fontSize: '16px'
        }}
        title="Toggle Controls"
      >
        ⚙️
      </button>

      {/* Controls Panel */}
      {showUI && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 100,
          padding: '20px',
          background: 'linear-gradient(135deg, rgba(0,0,0,0.8), rgba(0,0,0,0.6))',
          backdropFilter: 'blur(10px)',
          borderRadius: '0 0 20px 0',
          minWidth: '300px',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}>
          <h1 style={{
            color: '#ffd700',
            marginBottom: '20px',
            fontSize: '1.8em',
            textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
          }}>🏀 3D Shot Chart</h1>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{
                display: 'block',
                fontWeight: 'bold',
                marginBottom: '5px',
                fontSize: '0.9em'
              }}>Shot Data (JSON):</label>
              <textarea
                value={shotData}
                onChange={(e) => setShotData(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.9)',
                  color: '#333',
                  fontSize: '12px',
                  height: '100px',
                  resize: 'vertical',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box'
                }}
                placeholder='[{"x": 5, "y": 15, "made": true}, {"x": -3, "y": 20, "made": false}]'
              />
              <div style={{
                fontSize: '10px',
                color: '#aaa',
                marginTop: '5px',
                lineHeight: '1.3'
              }}>
                Format: x (-25 to 25), y (4 to 47 feet from baseline)<br/>
                Basket at (0, 4) - 4 feet from baseline
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontWeight: 'bold',
                marginBottom: '5px',
                fontSize: '0.9em'
              }}>Shot Arc Height:</label>
              <input
                type="range"
                min="5"
                max="25"
                value={trajectoryHeight}
                onChange={(e) => setTrajectoryHeight(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontWeight: 'bold',
                marginBottom: '5px',
                fontSize: '0.9em'
              }}>Camera Angle:</label>
              <select
                value={viewAngle}
                onChange={(e) => setViewAngle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.9)',
                  color: '#333',
                  fontSize: '12px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="overhead">Overhead View</option>
                <option value="side">Side Angle</option>
                <option value="corner">Corner View</option>
                <option value="broadcast">Broadcast Angle</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: '0.9em'
              }}>
                <input
                  type="checkbox"
                  checked={showCourt}
                  onChange={(e) => setShowCourt(e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                Show Court
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: '0.9em'
              }}>
                <input
                  type="checkbox"
                  checked={animateShots}
                  onChange={(e) => setAnimateShots(e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                Animate Shots
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: '0.9em'
              }}>
                <input
                  type="checkbox"
                  checked={showTrajectories}
                  onChange={(e) => setShowTrajectories(e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                Show Trajectories
              </label>
            </div>

            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              <button
                onClick={generateRandomData}
                style={{
                  padding: '8px 15px',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'linear-gradient(45deg, #ffd700, #ffed4e)',
                  color: '#333',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '12px',
                  margin: '2px'
                }}
              >
                Sample Data
              </button>
              <button
                onClick={updateVisualization}
                style={{
                  padding: '8px 15px',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'linear-gradient(45deg, #ffd700, #ffed4e)',
                  color: '#333',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '12px',
                  margin: '2px'
                }}
              >
                Update
              </button>
              <button
                onClick={clearChart}
                style={{
                  padding: '8px 15px',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'linear-gradient(45deg, #ffd700, #ffed4e)',
                  color: '#333',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '12px',
                  margin: '2px'
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Panel */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        zIndex: 100,
        background: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,215,0,0.1))',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,215,0,0.3)',
        borderRadius: '15px',
        padding: '15px',
        minWidth: '200px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.9em'
          }}>
            <span>Total Shots:</span>
            <span style={{
              fontWeight: 'bold',
              color: '#ffd700',
              fontSize: '1.1em'
            }}>{stats.totalShots}</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.9em'
          }}>
            <span>Made:</span>
            <span style={{
              fontWeight: 'bold',
              color: '#ffd700',
              fontSize: '1.1em'
            }}>{stats.madeShots}</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.9em'
          }}>
            <span>Shooting %:</span>
            <span style={{
              fontWeight: 'bold',
              color: '#ffd700',
              fontSize: '1.1em'
            }}>{stats.shootingPct}%</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.9em'
          }}>
            <span>Avg Distance:</span>
            <span style={{
              fontWeight: 'bold',
              color: '#ffd700',
              fontSize: '1.1em'
            }}>{stats.avgDistance} ft</span>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(10px)',
        borderRadius: '25px',
        padding: '15px 25px',
        display: 'flex',
        gap: '15px',
        alignItems: 'center'
      }}>
        <button
          onClick={rotateCamera}
          style={{
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            padding: '10px 15px',
            borderRadius: '20px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          🔄 Rotate
        </button>
        <button
          onClick={resetCamera}
          style={{
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            padding: '10px 15px',
            borderRadius: '20px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          📷 Reset View
        </button>
        <button
          onClick={toggleFullscreen}
          style={{
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            padding: '10px 15px',
            borderRadius: '20px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          ⛶ Fullscreen
        </button>
      </div>

      {/* Three.js Container */}
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default BasketballShotChart;