// --- CẤU HÌNH HỆ THỐNG VÀ ĐỒ HỌA ---
let scene, camera, renderer;
const moveSpeed = 0.08;
const rotateSpeed = 0.003;

// Biến trạng thái di chuyển và xoay
let moveVector = { x: 0, z: 0 };
let playerVelocity = new THREE.Vector3();
let cameraRotation = { yaw: 0, pitch: 0 };

// Mảng chứa các vật thể va chạm (Tường)
const collidableObjects = [];

// Khởi tạo Game
function init() {
    // 1. Tạo Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111100);
    scene.fog = new THREE.FogExp2(0x1a1a0a, 0.12);

    // 2. Tạo Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(2, 1.6, 2); // Chiều cao góc nhìn nhân vật ~1.6m

    // 3. Tạo Renderer tối ưu mobile
    renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.getElementById('game-container').appendChild(renderer.domElement);

    // 4. Ánh sáng mang phong cách đèn huỳnh quang Backrooms
    const ambientLight = new THREE.AmbientLight(0xaaaa77, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffee, 0.4);
    dirLight.position.set(0, 10, 0);
    scene.add(dirLight);

    // 5. Xây dựng Bản đồ môi trường (Backrooms Level 0)
    generateBackroomsMap();

    // 6. Kích hoạt hệ thống điều khiển di động
    setupMobileControls();

    // 7. Lắng nghe sự kiện đổi kích thước màn hình
    window.addEventListener('resize', onWindowResize, false);

    // Bắt đầu vòng lặp game
    animate();
}

// --- TẠO MÔI TRƯỜNG MAP ---
function generateBackroomsMap() {
    // Bản đồ ma trận đơn giản (1 = Tường, 0 = Đường đi)
    const mapGrid = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
        [1,0,1,0,1,0,1,1,1,0,1,0,1,0,1],
        [1,0,1,0,0,0,1,0,0,0,0,0,1,0,1],
        [1,0,1,1,1,1,1,0,1,1,1,1,1,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,0,1,1,1,0,1,1,1,0,1,1,1],
        [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
        [1,0,1,1,1,0,1,1,1,0,1,1,1,0,1],
        [1,0,0,0,0,0,1,0,1,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];

    const wallSize = 4;
    const wallHeight = 3.5;

    // Tạo các chất liệu (Materials) cơ bản màu Backrooms
    const wallMat = new THREE.MeshBasicMaterial({ color: 0xcccc77 }); // Tường vàng úa
    const floorMat = new THREE.MeshBasicMaterial({ color: 0x887744 }); // Thảm bẩn
    const ceilMat = new THREE.MeshBasicMaterial({ color: 0xddddcc }); // Trần thạch cao

    const wallGeo = new THREE.BoxGeometry(wallSize, wallHeight, wallSize);

    for (let r = 0; r < mapGrid.length; r++) {
        for (let c = 0; c < mapGrid[r].length; c++) {
            const posX = c * wallSize;
            const posZ = r * wallSize;

            // Tạo sàn và trần cho mỗi ô vuông
            const floorGeo = new THREE.PlaneGeometry(wallSize, wallSize);
            const floor = new THREE.Mesh(floorGeo, floorMat);
            floor.rotation.x = -Math.PI / 2;
            floor.position.set(posX, 0, posZ);
            scene.add(floor);

            const ceil = new THREE.Mesh(floorGeo, ceilMat);
            ceil.rotation.x = Math.PI / 2;
            ceil.position.set(posX, wallHeight, posZ);
            scene.add(ceil);

            // Nếu ô là tường (1)
            if (mapGrid[r][c] === 1) {
                const wall = new THREE.Mesh(wallGeo, wallMat);
                wall.position.set(posX, wallHeight / 2, posZ);
                scene.add(wall);
                collidableObjects.push(wall); // Thêm vào danh sách va chạm
            }
        }
    }
}

// --- HỆ THỐNG ĐIỀU KHIỂN SỬ CHẠM (TOUCH CONTROLS) ---
function setupMobileControls() {
    const knob = document.getElementById('joystick-knob');
    const container = document.getElementById('joystick-container');
    const lookZone = document.getElementById('look-zone');

    let joystickActive = false;
    let joystickTouchId = null;
    let startX = 0, startY = 0;
    const maxRadius = 40; // Giới hạn kéo của núm joystick

    // Xử lý Vuốt màn hình để nhìn xung quanh (Look Zone)
    let lookTouchId = null;
    let lastLookX = 0, lastLookY = 0;

    window.addEventListener('touchstart', (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            
            // Kiểm tra nếu chạm vào vùng Joystick
            const rect = container.getBoundingClientRect();
            const touchInJoystick = (
                touch.clientX >= rect.left && touch.clientX <= rect.right &&
                touch.clientY >= rect.top && touch.clientY <= rect.bottom
            );

            if (touchInJoystick && !joystickActive) {
                joystickActive = true;
                joystickTouchId = touch.identifier;
                startX = rect.left + rect.width / 2;
                startY = rect.top + rect.height / 2;
            } 
            // Nếu chạm ngoài vùng Joystick -> Tính là vùng xoay Camera
            else if (lookTouchId === null) {
                lookTouchId = touch.identifier;
                lastLookX = touch.clientX;
                lastLookY = touch.clientY;
            }
        }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];

            // Xử lý di chuyển Joystick
            if (joystickActive && touch.identifier === joystickTouchId) {
                let dx = touch.clientX - startX;
                let dy = touch.clientY - startY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > maxRadius) {
                    dx = (dx / distance) * maxRadius;
                    dy = (dy / distance) * maxRadius;
                }

                knob.style.transform = `translate(${dx}px, ${dy}px)`;

                // Gán vector di chuyển (dx tương ứng đi ngang, dy tương ứng đi tiến/lùi)
                // Chuẩn hóa góc: Kéo lên (dy âm) -> tiến lên (-Z)
                moveVector.x = dx / maxRadius;
                moveVector.z = dy / maxRadius;
            }

            // Xử lý di chuyển Góc nhìn Camera
            if (touch.identifier === lookTouchId) {
                const movementX = touch.clientX - lastLookX;
                const movementY = touch.clientY - lastLookY;

                cameraRotation.yaw -= movementX * rotateSpeed;
                cameraRotation.pitch -= movementY * rotateSpeed;

                // Giới hạn góc ngước lên / cúi xuống tránh lật camera
                cameraRotation.pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, cameraRotation.pitch));

                lastLookX = touch.clientX;
                lastLookY = touch.clientY;
            }
        }
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];

            if (joystickActive && touch.identifier === joystickTouchId) {
                joystickActive = false;
                joystickTouchId = null;
                knob.style.transform = 'translate(0px, 0px)';
                moveVector.x = 0;
                moveVector.z = 0;
            }

            if (touch.identifier === lookTouchId) {
                lookTouchId = null;
            }
        }
    });
}

// --- CẬP NHẬT TRẠNG THÁI VÀ VÒNG LẶP RENDER ---
function animate() {
    requestAnimationFrame(animate);

    // Cập nhật hướng quay Camera dựa vào Yaw và Pitch thu được từ cảm ứng
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.x = cameraRotation.pitch;
    euler.y = cameraRotation.yaw;
    camera.quaternion.setFromEuler(euler);

    // Tính toán Vector di chuyển dựa theo hướng quay hiện tại của Camera
    if (moveVector.x !== 0 || moveVector.z !== 0) {
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        
        // Giữ di chuyển cố định trên mặt phẳng ngang (Y = 0)
        forward.y = 0;
        right.y = 0;
        forward.normalize();
        right.normalize();

        // Tính toán vận tốc (moveVector.z âm/dương điều hướng tiến lùi chuẩn xác)
        playerVelocity.copy(forward).multiplyScalar(-moveVector.z * moveSpeed);
        playerVelocity.add(right.multiplyScalar(moveVector.x * moveSpeed));

        // Xử lý kiểm tra va chạm cơ bản (Simple Bounding Box)
        const oldPos = camera.position.clone();
        camera.position.add(playerVelocity);

        // Phát hiện va chạm bằng khoảng cách tới tâm tường gần nhất
        for (let i = 0; i < collidableObjects.length; i++) {
            const wall = collidableObjects[i];
            const dist = camera.position.distanceTo(wall.position);
            if (dist < 2.2) { // Khống chế khoảng cách va chạm với khối tường 4x4
                camera.position.copy(oldPos); // Trả lại vị trí cũ nếu va chạm
                break;
            }
        }
    }

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Chạy khởi tạo khi tải trang
window.onload = init;
