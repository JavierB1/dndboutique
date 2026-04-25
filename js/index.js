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

let clientesGlobal = [];
let editandoID = null;

// Funciones globales
window.toggleModal = () => {
    editandoID = null;
    const form = document.getElementById('form-cliente');
    if (form) form.reset();
    document.getElementById('modal-titulo').innerText = "Registrar Venta";
    document.getElementById('estado').value = "Pendiente"; // Prioridad Pendiente
    document.getElementById('modalCliente').classList.toggle('hidden');
};

window.toggleNotificaciones = () => {
    document.getElementById('panel-notif').classList.toggle('hidden');
};

window.abrirEditor = (id) => {
    const cliente = clientesGlobal.find(c => c.id === id);
    if (cliente) {
        editandoID = id;
        document.getElementById('modal-titulo').innerText = "Editar Información";
        document.getElementById('nombre').value = cliente.nombre || "";
        document.getElementById('telefono').value = cliente.telefono || "";
        document.getElementById('pedido').value = cliente.pedido || "";
        document.getElementById('monto').value = cliente.monto || "";
        document.getElementById('estado').value = cliente.estado || "Pendiente";
        document.getElementById('observaciones').value = cliente.observaciones || "";
        document.getElementById('modalCliente').classList.remove('hidden');
    }
};

window.cambiarEstado = async (id, nuevoEstado) => {
    try {
        await updateDoc(doc(db, "clientes", id), {
            estado: nuevoEstado,
            fechaCambioEstado: Date.now()
        });
    } catch (e) { console.error(e); }
};

window.marcarSeguimiento = async (id) => {
    try {
        await updateDoc(doc(db, "clientes", id), { fechaCambioEstado: Date.now() });
    } catch (e) { console.error(e); }
};

window.eliminarCliente = async (id) => {
    if (confirm('¿Eliminar este registro de forma permanente?')) {
        try { await deleteDoc(doc(db, "clientes", id)); } catch (e) { console.error(e); }
    }
};

const obtenerContador = (inicio) => {
    if (!inicio) return "-";
    const ms = Date.now() - inicio;
    const minutos = Math.floor(ms / 60000);
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);
    if (minutos < 1) return "recién";
    if (minutos < 60) return `${minutos}m`;
    if (horas < 24) return `${horas}h`;
    return `${dias}d`;
};

window.renderizarTabla = () => {
    const tabla = document.getElementById('tabla-body');
    const buscador = document.getElementById('buscador')?.value.toLowerCase() || "";
    const filtro = document.getElementById('filtro-estado')?.value || "Todos";
    if (!tabla) return;
    tabla.innerHTML = '';
    
    let stats = { total: 0, socios: 0, pendientes: 0, envios: 0, descartados: 0 };

    clientesGlobal.filter(c => {
        const fullText = `${c.nombre} ${c.telefono} ${c.pedido} ${c.observaciones}`.toLowerCase();
        return fullText.includes(buscador) && (filtro === 'Todos' || c.estado === filtro);
    }).forEach(c => {
        const montoNum = parseFloat(c.monto || 0);
        if(c.estado === 'Entregado') { stats.total += montoNum; stats.socios++; }
        if(c.estado === 'Pendiente') stats.pendientes++;
        if(c.estado === 'En Envío') stats.envios++;
        if(c.estado === 'Descartado') stats.descartados++;

        const tiempo = obtenerContador(c.fechaCambioEstado);
        
        // Estilos de colores por estado
        const colorClase = 
            c.estado === 'Pendiente' ? 'bg-orange-100 text-orange-700' : 
            c.estado === 'En Envío' ? 'bg-blue-100 text-blue-700' : 
            c.estado === 'Entregado' ? 'bg-green-100 text-green-700' : 
            c.estado === 'Descartado' ? 'bg-slate-200 text-slate-500 opacity-60' : 'bg-slate-100';

        tabla.innerHTML += `
            <tr class="border-b text-sm hover:bg-slate-50 transition-colors ${c.estado === 'Descartado' ? 'bg-slate-50/50' : ''}">
                <td class="px-8 py-4">
                    <span class="font-bold text-slate-800 text-base">${c.nombre || c.telefono}</span><br>
                    <small class="text-indigo-600 font-bold">${c.pedido || '-'}</small>
                </td>
                <td class="px-8 py-4 max-w-[250px]">
                    <div class="bg-amber-50 border-l-4 border-amber-400 p-2 text-[11px] italic text-slate-600 whitespace-pre-wrap">${c.observaciones || '-'}</div>
                </td>
                <td class="px-8 py-4 font-black text-base">$${montoNum.toFixed(2)}</td>
                <td class="px-8 py-4">
                    <select onchange="window.cambiarEstado('${c.id}', this.value)" class="p-2 rounded-lg ${colorClase} font-black text-[10px] w-full shadow-sm border-none cursor-pointer">
                        <option value="Interesado" ${c.estado === 'Interesado' ? 'selected' : ''}>🟡 Interesado</option>
                        <option value="Pendiente" ${c.estado === 'Pendiente' ? 'selected' : ''}>🟠 Pendiente</option>
                        <option value="En Envío" ${c.estado === 'En Envío' ? 'selected' : ''}>🔵 En Envío</option>
                        <option value="Entregado" ${c.estado === 'Entregado' ? 'selected' : ''}>🟢 Entregado</option>
                        <option value="Descartado" ${c.estado === 'Descartado' ? 'selected' : ''}>⚫ Descartado</option>
                    </select>
                </td>
                <td class="px-8 py-4 text-center"><span class="text-[10px] font-black text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">${tiempo}</span></td>
                <td class="px-8 py-4 flex gap-2 justify-center">
                    <button onclick="window.abrirEditor('${c.id}')" class="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg"><i class="fa-solid fa-pen text-[10px]"></i></button>
                    <a href="https://wa.me/503${c.telefono}" target="_blank" class="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center"><i class="fa-brands fa-whatsapp text-lg"></i></a>
                    <button onclick="window.eliminarCliente('${c.id}')" class="w-8 h-8 bg-red-50 text-red-400 rounded-lg"><i class="fa-solid fa-trash text-[10px]"></i></button>
                </td>
            </tr>`;
    });

    // Actualizar contadores del Dashboard
    document.getElementById('count-pendientes').innerText = stats.pendientes;
    document.getElementById('count-envios').innerText = stats.envios;
    document.getElementById('total-ventas').innerText = `$${stats.total.toFixed(2)}`;
    document.getElementById('count-clientes').innerText = stats.socios;
    if(document.getElementById('count-descartados')) document.getElementById('count-descartados').innerText = stats.descartados;
};

const actualizarNotificaciones = () => {
    const lista = document.getElementById('lista-notificaciones');
    const badge = document.getElementById('notif-badge');
    if(!lista || !badge) return;
    lista.innerHTML = '';
    let alertas = [];
    clientesGlobal.forEach(c => {
        const ms = Date.now() - (c.fechaCambioEstado || Date.now());
        const horas = Math.floor(ms / 3600000);
        const dias = Math.floor(horas / 24);

        // REGLA: Pendiente por más de 8 HORAS
        if (c.estado === 'Pendiente' && horas >= 8) {
            alertas.push({ id: c.id, nombre: c.nombre || c.telefono, msg: `Escribir (hace ${horas}h)`, color: 'text-orange-600', icon: 'fa-clock' });
        }
        // REGLA: Re-surtido tras 20 DÍAS
        if (c.estado === 'Entregado' && dias >= 20) {
            alertas.push({ id: c.id, nombre: c.nombre || c.telefono, msg: `Re-surtido (${dias}d)`, color: 'text-blue-600', icon: 'fa-arrows-rotate' });
        }
    });
    badge.innerText = alertas.length;
    badge.classList.toggle('hidden', alertas.length === 0);
    document.getElementById('notif-count-text').innerText = alertas.length;
    if (alertas.length === 0) lista.innerHTML = '<p class="text-[10px] text-slate-400 text-center py-6 font-bold uppercase italic">Todo al día ✨</p>';
    alertas.forEach(a => {
        lista.innerHTML += `
            <div class="p-4 bg-white border-b border-slate-50 flex justify-between items-center hover:bg-slate-50 transition-colors">
                <div><b class="text-[11px] text-slate-800">${a.nombre}</b><br><span class="text-[10px] ${a.color} font-black italic"><i class="fa-solid ${a.icon} mr-1"></i>${a.msg}</span></div>
                <button onclick="window.marcarSeguimiento('${a.id}')" class="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center"><i class="fa-solid fa-check text-[10px]"></i></button>
            </div>`;
    });
};

onSnapshot(clientesRef, (snapshot) => {
    clientesGlobal = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    clientesGlobal.sort((a, b) => (b.fechaCambioEstado || 0) - (a.fechaCambioEstado || 0));
    window.renderizarTabla();
    actualizarNotificaciones();
});

document.getElementById('form-cliente').addEventListener('submit', async (e) => {
    e.preventDefault();
    const ahora = Date.now();
    const idFinal = editandoID || ahora.toString();
    const datos = {
        nombre: document.getElementById('nombre').value.trim(),
        telefono: document.getElementById('telefono').value.trim(),
        pedido: document.getElementById('pedido').value.trim(),
        monto: parseFloat(document.getElementById('monto').value || 0).toFixed(2),
        estado: document.getElementById('estado').value,
        observaciones: document.getElementById('observaciones').value.trim(),
        fechaCambioEstado: editandoID ? (clientesGlobal.find(c => c.id === editandoID)?.fechaCambioEstado || ahora) : ahora
    };
    try {
        await setDoc(doc(db, "clientes", idFinal), datos, { merge: true });
        window.toggleModal();
    } catch (err) { alert("Error al guardar."); }
});

setInterval(() => { window.renderizarTabla(); actualizarNotificaciones(); }, 60000);
