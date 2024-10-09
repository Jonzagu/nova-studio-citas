// scripts.js

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC3IkMv8JazhSyWHyW7CkfGtSjvtGHaoQo",
  authDomain: "nova-citas.firebaseapp.com",
  databaseURL: "https://nova-citas-default-rtdb.firebaseio.com",
  projectId: "nova-citas",
  storageBucket: "nova-citas.appspot.com",
  messagingSenderId: "902412003948",
  appId: "1:902412003948:web:c12b7ec529f05f57f10649"
};

// Inicializar Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase inicializado');
} catch (error) {
    console.error('Error al inicializar Firebase:', error);
}

// Inicializar servicios
const auth = firebase.auth();
const db = firebase.firestore();
console.log('Servicios de Firebase inicializados');

document.addEventListener('DOMContentLoaded', () => {
    console.log('Nova Studio App Cargada');
    
    // Manejar el formulario de registro
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Manejar el formulario de login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Manejar el formulario de agendar cita
    const scheduleForm = document.getElementById('scheduleForm');
    if (scheduleForm) {
        scheduleForm.addEventListener('submit', handleSchedule);
    }

    // Manejar la selección de fecha para mostrar citas existentes
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.addEventListener('change', (e) => {
            loadExistingAppointments(e.target.value);
        });
    }

    // Manejar el botón de cerrar sesión
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    // Cargar promociones en la página de promociones
    const promotionsList = document.getElementById('promotionsList');
    if (promotionsList) {
        loadPromotions();
    }

    // Redirigir a login si el usuario no está autenticado en páginas protegidas
    const currentPage = window.location.pathname.split('/').pop();
    const protectedPages = ['schedule.html', 'promotions.html'];
    if (protectedPages.includes(currentPage)) {
        auth.onAuthStateChanged(handleAuthStateChange);
    }

    // Cargar citas existentes si ya hay una fecha seleccionada al cargar la página
    const initialDate = document.getElementById('date');
    if (initialDate && initialDate.value) {
        loadExistingAppointments(initialDate.value);
    }
});

// Función para manejar el registro
async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const password = document.getElementById('password').value;

    // Validar que todos los campos estén completos
    if (!username || !email || !telefono || !password) {
        alert('Por favor, completa todos los campos.');
        return;
    }

    // Validar el formato del número de teléfono (10 dígitos)
    const telefonoPattern = /^[0-9]{8}$/;
    if (!telefonoPattern.test(telefono)) {
        alert('Por favor, ingresa un número de teléfono válido de 10 dígitos.');
        return;
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        console.log('Usuario registrado:', user.uid);
        
        // Guardar información adicional en Firestore
        await db.collection('clientes').doc(user.uid).set({
            nombre: username,
            email: email,
            telefono: telefono,
            fecha_nacimiento: '',
            fecha_registro: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert('Registro exitoso. Puedes iniciar sesión ahora.');
        window.location.href = '../pages/login.html';
    } catch (error) {
        console.error('Error en el registro:', error);
        alert(`Error en el registro: ${error.message}`);
    }
}

// Función para manejar el estado de autenticación
function handleAuthStateChange(user) {
    if (!user) {
        alert('Debes iniciar sesión para acceder a esta página.');
        window.location.href = '../pages/login.html';
    } else {
        console.log('Usuario autenticado:', user.uid);
    }
}

// Función para manejar el login
async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        alert('Por favor, completa todos los campos.');
        return;
    }

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log('Usuario inició sesión:', userCredential.user.email);
        alert('Inicio de sesión exitoso.');
        window.location.href = '../pages/schedule.html';
    } catch (error) {
        console.error('Error en el login:', error);
        alert(`Error en el login: ${error.message}`);
    }
}

// Función para manejar el agendamiento de citas
async function handleSchedule(e) {
    e.preventDefault();
    
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;
    const service = document.getElementById('service').value;
    const availabilityMessage = document.getElementById('availabilityMessage');

    if (!date || !time || !service) {
        availabilityMessage.textContent = 'Por favor, completa todos los campos.';
        availabilityMessage.style.color = 'red';
        return;
    }

    const user = auth.currentUser;
    if (!user) {
        availabilityMessage.textContent = 'Debes iniciar sesión para agendar una cita.';
        availabilityMessage.style.color = 'red';
        return;
    }

    try {

         const clienteDoc = await db.collection('clientes').doc(user.uid).get();
        const clienteNombre = clienteDoc.exists ? clienteDoc.data().nombre : 'Desconocido';
        // Verificar disponibilidad
        const querySnapshot = await db.collection('citas')
            .where('fecha_cita', '==', `${date} ${time}`)
            .get();

        if (querySnapshot.empty) {
            await db.collection('citas').add({
                cliente_id: user.uid,
                cliente_nombre: clienteNombre,
                servicio_id: service,
                fecha_cita: `${date} ${time}`,
                estado: 'Pendiente',
                observaciones: '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            availabilityMessage.textContent = 'Cita agendada exitosamente.';
            availabilityMessage.style.color = 'green';
            e.target.reset();
            loadExistingAppointments(date);
        } else {
            availabilityMessage.textContent = 'La fecha y hora seleccionadas no están disponibles.';
            availabilityMessage.style.color = 'red';
        }
    } catch (error) {
        console.error('Error al agendar cita:', error);
        availabilityMessage.textContent = 'Ocurrió un error al agendar la cita. Intenta de nuevo.';
        availabilityMessage.style.color = 'red';
    }
}

// Función para cargar citas existentes
async function loadExistingAppointments(date) {
    
    const appointmentsList = document.getElementById('appointmentsList');
    if (!appointmentsList) {
        console.error('Elemento #appointmentsList no encontrado.');
        return;
    }

    appointmentsList.innerHTML = ''; // Limpiar la lista
    console.log(`Cargando citas para la fecha: ${date}`);

    try {
        const querySnapshot = await db.collection('citas')
            .where('fecha_cita', '>=', `${date} 00:00`)
            .where('fecha_cita', '<=', `${date} 23:59`)
            .orderBy('fecha_cita', 'asc')
            .get();

        if (querySnapshot.empty) {
            console.log('No hay citas para esta fecha.');
            appointmentsList.innerHTML = '<li>No hay citas agendadas para esta fecha.</li>';
        } else {
            console.log(`Encontradas ${querySnapshot.size} citas.`);
            querySnapshot.forEach((doc) => {
                const appointment = doc.data();
                const li = document.createElement('li');
                li.textContent = `${appointment.fecha_cita} - Servicio ID: ${appointment.servicio_id} - Estado: ${appointment.estado}`;
                appointmentsList.appendChild(li);
            });
        }
    } catch (error) {
        console.error('Error al cargar citas existentes:', error);
        appointmentsList.innerHTML = '<li>Error al cargar las citas.</li>';
    }
}

// Función para manejar el cierre de sesión
async function handleLogout() {
    try {
        await auth.signOut();
        alert('Sesión cerrada correctamente.');
        window.location.href = '../pages/login.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        alert('Ocurrió un error al cerrar sesión.');
    }
}

// Función para cargar promociones
async function loadPromotions() {
    const promotionsList = document.getElementById('promotionsList');
    if (!promotionsList) return;

    try {
        const querySnapshot = await db.collection('promociones').get();
        
        if (querySnapshot.empty) {
            promotionsList.innerHTML = '<li>No hay promociones disponibles.</li>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const promotion = doc.data();
            const li = document.createElement('li');
            li.textContent = `${promotion.descripcion} - Válido hasta: ${promotion.fecha_vigencia}`;
            promotionsList.appendChild(li);
        });
    } catch (error) {
        console.error('Error al cargar promociones:', error);
        promotionsList.innerHTML = '<li>Error al cargar promociones.</li>';
    }
}

// Función auxiliar para capitalizar la primera letra
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
