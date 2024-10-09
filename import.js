// import.js

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Ruta al archivo de clave de la cuenta de servicio
const serviceAccount = require('./serviceAccountKey.json');

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Función para importar datos desde un archivo JSON a una colección de Firestore
async function importData(collectionName, filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Si el JSON es una lista de objetos
    if (Array.isArray(data)) {
      for (const doc of data) {
        // Usar un campo único como ID, si existe, o dejar que Firestore lo genere
        const docId = doc.id ? doc.id.toString() : undefined;
        if (docId) {
          await db.collection(collectionName).doc(docId).set(doc);
        } else {
          await db.collection(collectionName).add(doc);
        }
      }
    }
    // Si el JSON es un objeto con claves como IDs
    else if (typeof data === 'object') {
      for (const [docId, doc] of Object.entries(data)) {
        await db.collection(collectionName).doc(docId).set(doc);
      }
    }

    console.log(`Datos importados correctamente a la colección "${collectionName}".`);
  } catch (error) {
    console.error(`Error al importar datos a la colección "${collectionName}":`, error);
  }
}

// Importar cada colección
async function runImport() {
  await importData('Clientes', path.join(__dirname, 'clientes.json'));
  await importData('Servicios', path.join(__dirname, 'servicios.json')); // Asegúrate de tener este archivo
  await importData('Citas', path.join(__dirname, 'citas.json'));         // Asegúrate de tener este archivo
  // Añade más llamadas a importData si tienes más colecciones
}

runImport().then(() => {
  console.log('Importación completada.');
  process.exit(0);
}).catch((error) => {
  console.error('Error en la importación:', error);
  process.exit(1);
});
