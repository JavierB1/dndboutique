import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyButybOOpJFvO3JaLrl2RaW8NsELSYQxG4",
  authDomain: "dndboutique.firebaseapp.com",
  projectId: "dndboutique",
  storageBucket: "dndboutique.firebasestorage.app",
  messagingSenderId: "1063643456321",
  appId: "1:1063643456321:web:962bdaf55aa082866f77c0",
  measurementId: "G-PFDWRKEJXQ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const clientesRef = collection(db, "clientes");

let clientes = [];
let editandoID = null;

onSnapshot(clientesRef, (snapshot) => {
    clientes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    clientes.sort((a, b) => b.id - a.id);
    renderizarTabla();
    actualizarNotificaciones();
});

window.toggleModal = () => {
    editandoID = null;
    document.getElementById('form-cliente').reset();
    document.getElementById('modal-titulo').innerText = "Registrar Venta";
    document.getElementById('modalCliente').classList.toggle('hidden');
};

window.abrirEditor = (id) => {
    const cliente = clientes.find(c => c.id == id);
    if (cliente) {
        editandoID = id;
        document.getElementById('modal-titulo').innerText = "Editar Información / Notas";
        // Si el nombre es igual al teléfono formateado, lo dejamos vacío en el input para que sea más limpio
        const telFormateado = formatearTelefono(cliente.telefono);
        document.getElementById('nombre').value = (cliente.nombre === telFormateado) ? "" : cliente.nombre;
        document.getElementById('telefono').value = cliente.telefono;
        document.getElementById('pedido').value = cliente.pedido;
        document.getElementById('monto').value = (cliente.monto == 0 || !cliente.monto) ? "" : cliente.monto;
        document.getElementById('estado').value = cliente.estado;
        document.getElementById('observaciones').value = cliente.observaciones || "";
        document.getElementById('modalCliente').classList.remove('hidden');
    }
};

document.getElementById('form-cliente').addEventListener('submit', async (e) => {
    e.preventDefault();
    const ahora = Date.now();
    const idUnico = editandoID || ahora.toString();
    const telRaw = document.getElementById('telefono').value.trim();
    const nombreInput = document.getElementById('nombre').value.trim();
    
    // Si no hay nombre, usamos el teléfono formateado
    const nombreFinal = nombreInput || formatearTelefono(telRaw);
    
    // Si no hay monto, guardamos 0 o vacío para manejar el "-" después
    const montoInput = document.getElementById('monto').value;
    const montoFinal = montoInput ? parseFloat(montoInput).toFixed(2) : 0;

    const datos = {
        nombre: nombreFinal,
        telefono: telRaw,
        pedido: document.getElementById('pedido').value.trim(),
        monto: montoFinal,
        estado: document.getElementById('estado').value,
        observaciones: document.getElementById('observaciones').value.trim(),
    };

    if (!editandoID) datos.fechaCambioEstado = ahora;

    try {
        await setDoc(doc(db, "clientes", idUnico), datos, { merge: true });
        window.toggleModal();
    } catch (error) {
        console.error("Error:", error);
    }
});

function formatearTelefono(num) {
    const s = num.toString().replace(/\s/g, "");
    return s.length === 8 ? s.slice(0, 4) + " " + s.slice(4) : s;
}

window.cambiarEstado = async (id, nuevoEstado) => {
    await updateDoc(doc(db, "clientes", id.toString()), {
        estado: nuevoEstado,
        fechaCambioEstado: Date.now()
    });
};

window.marcarSeguimiento = async (id) => {
    await updateDoc(doc(db, "clientes", id.toString()), { fechaCambioEstado: Date.now() });
};

window.eliminarCliente = async (id) => {
    if (confirm('¿Eliminar este registro para todos?')) {
        await deleteDoc(doc(db, "clientes", id.toString()));
    }
};

function obtenerContador(inicio) {
    const transcurrido = Date.now() - inicio;
    const minutos = Math.floor(transcurrido / 60000);
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);
    if (minutos < 1) return "recién";
    if (minutos < 60) return `${minutos}m`;
    if (horas < 24) return `${horas}h`;
    return `${dias}d`;
}

function actualizarNotificaciones() {
    const lista = document.getElementById('lista-notificaciones');
    const badge = document.getElementById('notif-badge');
    if(!lista || !badge) return;
    lista.innerHTML = '';
    let alertas = [];
    clientes.forEach(c => {
        const horas = Math.floor((Date.now() - c.fechaCambioEstado) / 3600000);
        const dias = Math.floor(horas / 24);
        if (c.estado === 'Pendiente' && horas >= 24) alertas.push({ id: c.id, nombre: c.nombre, msg: `Sin respuesta (${horas}h)`, color: 'text-orange-600' });
        if (c.estado === 'Entregado' && dias >= 20) alertas.push({ id: c.id, nombre: c.nombre, msg: `Re-surtido (${dias}d)`, color: 'text-red-600' });
    });
    badge.innerText = alertas.length;
    badge.classList.toggle('hidden', alertas.length === 0);
    alertas.forEach(a => {
        lista.innerHTML += `<div class="p-3 bg-white border-b flex justify-between items-center text-[11px]">
            <div><b class="${a.color}">${a.nombre}</b><br><span class="text-slate-400">${a.msg}</span></div>
            <button onclick="marcarSeguimiento('${a.id}')" class="p-1 bg-blue-50 text-blue-600 rounded">OK</button>
        </div>`;
    });
}

function renderizarTabla() {
    const tabla = document.getElementById('tabla-body');
    if(!tabla) return;
    const buscador = document.getElementById('buscador').value.toLowerCase();
    const filtro = document.getElementById('filtro-estado').value;
    tabla.innerHTML = '';
    let stats = { total: 0, socios: 0, pendientes: 0, envios: 0 };

    clientes.filter(c => {
        const matchText = c.nombre.toLowerCase().includes(buscador) || c.telefono.includes(buscador);
        const matchFiltro = filtro === 'Todos' || c.estado === filtro;
        return matchText && matchFiltro;
    }).forEach(c => {
        const montoNum = parseFloat(c.monto || 0);
        if(c.estado === 'Entregado') { stats.total += montoNum; stats.socios++; }
        if(c.estado === 'Pendiente') stats.pendientes++;
        if(c.estado === 'En Envío') stats.envios++;

        const tiempo = obtenerContador(c.fechaCambioEstado);
        const colorSel = c.estado === 'Pendiente' ? 'bg-orange-100 text-orange-700' : 
                         c.estado === 'En Envío' ? 'bg-blue-100 text-blue-700' : 
                         c.estado === 'Entregado' ? 'bg-green-100 text-green-700' : 'bg-slate-100';

        // Lógica para mostrar guion si el monto es 0 o vacío
        const montoMostrar = (montoNum > 0) ? `$${montoNum.toFixed(2)}` : "-";

        tabla.innerHTML += `
            <tr class="border-b text-sm">
                <td class="p-4"><b>${c.nombre}</b><br><small class="text-slate-400">${c.pedido || '-'}</small></td>
                <td class="p-4 font-bold text-slate-700">${montoMostrar}</td>
                <td class="p-4">
                    <select onchange="cambiarEstado('${c.id}', this.value)" class="p-1 rounded ${colorSel} font-bold text-[10px]">
                        <option value="Interesado" ${c.estado === 'Interesado' ? 'selected' : ''}>🟡 Interesado</option>
                        <option value="Pendiente" ${c.estado === 'Pendiente' ? 'selected' : ''}>🟠 Pendiente</option>
                        <option value="En Envío" ${c.estado === 'En Envío' ? 'selected' : ''}>🔵 En Envío</option>
                        <option value="Entregado" ${c.estado === 'Entregado' ? 'selected' : ''}>🟢 Entregado</option>
                    </select>
                </td>
                <td class="p-4 text-center"><small class="font-bold text-slate-500">${tiempo}</small></td>
                <td class="p-4 flex gap-2 justify-center">
                    <button onclick="abrirEditor('${c.id}')" class="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><i class="fa-solid fa-pen"></i></button>
                    <a href="https://wa.me/503${c.telefono}" target="_blank" class="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><i class="fa-brands fa-whatsapp"></i></a>
                    <button onclick="eliminarCliente('${c.id}')" class="p-2 text-slate-300 hover:text-red-500"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`;
    });

    document.getElementById('count-pendientes').innerText = stats.pendientes;
    document.getElementById('count-envios').innerText = stats.envios;
    document.getElementById('total-ventas').innerText = `$${stats.total.toFixed(2)}`;
    document.getElementById('count-clientes').innerText = stats.socios;
}

setInterval(() => renderizarTabla(), 60000);
```

### Un pequeño favor en el HTML:
Para que el navegador no te obligue a escribir el nombre, busca en tu archivo `index.html` la etiqueta del nombre y quítale la palabra `required`. Debería verse así:

```html
<input type="text" id="nombre" required ...>

<input type="text" id="nombre" placeholder="Nombre (opcional)" ...>
