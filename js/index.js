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

// --- FUNCIONES GLOBALES ---
window.toggleModal = () => {
    editandoID = null;
    const form = document.getElementById('form-cliente');
    if (form) form.reset();
    document.getElementById('modal-titulo').innerText = "Registrar Venta";
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
        document.getElementById('estado').value = cliente.estado || "Interesado";
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

// Esta función es la que hace que el "Check" de la notificación resetee el tiempo
window.marcarSeguimiento = async (id) => {
    try {
        await updateDoc(doc(db, "clientes", id), { 
            fechaCambioEstado: Date.now() 
        });
        // La notificación desaparecerá automáticamente al actualizarse el snapshot
    } catch (e) { console.error(e); }
};

window.eliminarCliente = async (id) => {
    if (confirm('¿Eliminar este registro?')) {
        try { await deleteDoc(doc(db, "clientes", id)); } catch (e) { console.error(e); }
    }
};

const obtenerContador = (inicio) => {
    if (!inicio) return "-";
    const transcurrido = Date.now() - inicio;
    const minutos = Math.floor(transcurrido / 60000);
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);
    if (minutos < 1) return "recién";
    if (minutos < 60) return `${minutos}m`;
    if (horas < 24) return `${horas}h`;
    return `${dias}d`;
};

// --- RENDERIZADO ---
window.renderizarTabla = () => {
    const tabla = document.getElementById('tabla-body');
    const buscador = document.getElementById('buscador')?.value.toLowerCase() || "";
    const filtro = document.getElementById('filtro-estado')?.value || "Todos";
    
    if (!tabla) return;
    tabla.innerHTML = '';
    
    let stats = { total: 0, socios: 0, pendientes: 0, envios: 0 };

    clientesGlobal.filter(c => {
        const busquedaTotal = `${c.nombre} ${c.telefono} ${c.pedido} ${c.observaciones}`.toLowerCase();
        const matchText = busquedaTotal.includes(buscador);
        const matchFiltro = filtro === 'Todos' || c.estado === filtro;
        return matchText && matchFiltro;
    }).forEach(c => {
        const montoNum = parseFloat(c.monto || 0);
        if(c.estado === 'Entregado') { stats.total += montoNum; stats.socios++; }
        if(c.estado === 'Pendiente') stats.pendientes++;
        if(c.estado === 'En Envío') stats.envios++;

        const tiempo = obtenerContador(c.fechaCambioEstado);
        const colorClase = 
            c.estado === 'Pendiente' ? 'bg-orange-100 text-orange-700' : 
            c.estado === 'En Envío' ? 'bg-blue-100 text-blue-700' : 
            c.estado === 'Entregado' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600';

        tabla.innerHTML += `
            <tr class="border-b text-sm hover:bg-slate-50 transition-colors">
                <td class="px-8 py-4">
                    <div class="flex flex-col gap-1">
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-slate-800 text-base">${c.nombre || c.telefono}</span>
                            ${c.observaciones ? '<i class="fa-solid fa-circle-info text-amber-500 text-[10px]"></i>' : ''}
                        </div>
                        <span class="text-[11px] text-indigo-600 font-bold italic">${c.pedido || 'Sin pedido'}</span>
                        ${c.observaciones ? `<span class="text-[10px] text-slate-400 border-l-2 border-amber-300 pl-2 mt-1 italic">${c.observaciones}</span>` : ''}
                    </div>
                </td>
                <td class="px-8 py-4 font-black text-slate-700">$${montoNum.toFixed(2)}</td>
                <td class="px-8 py-4">
                    <select onchange="window.cambiarEstado('${c.id}', this.value)" class="p-2 rounded-lg ${colorClase} font-extrabold text-[10px] border-none outline-none shadow-sm">
                        <option value="Interesado" ${c.estado === 'Interesado' ? 'selected' : ''}>🟡 Interesado</option>
                        <option value="Pendiente" ${c.estado === 'Pendiente' ? 'selected' : ''}>🟠 Pendiente</option>
                        <option value="En Envío" ${c.estado === 'En Envío' ? 'selected' : ''}>🔵 En Envío</option>
                        <option value="Entregado" ${c.estado === 'Entregado' ? 'selected' : ''}>🟢 Entregado</option>
                    </select>
                </td>
                <td class="px-8 py-4 text-center">
                    <span class="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-full">${tiempo}</span>
                </td>
                <td class="px-8 py-4 flex gap-2 justify-center">
                    <button onclick="window.abrirEditor('${c.id}')" class="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"><i class="fa-solid fa-pen text-[10px]"></i></button>
                    <a href="https://wa.me/503${c.telefono}" target="_blank" class="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white flex items-center justify-center"><i class="fa-brands fa-whatsapp"></i></a>
                    <button onclick="window.eliminarCliente('${c.id}')" class="w-8 h-8 bg-red-50 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"><i class="fa-solid fa-trash text-[10px]"></i></button>
                </td>
            </tr>`;
    });

    document.getElementById('count-pendientes').innerText = stats.pendientes;
    document.getElementById('count-envios').innerText = stats.envios;
    document.getElementById('total-ventas').innerText = `$${stats.total.toFixed(2)}`;
    document.getElementById('count-clientes').innerText = stats.socios;
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

        // Regla 1: Pendiente por más de 24h
        if (c.estado === 'Pendiente' && horas >= 24) {
            alertas.push({ id: c.id, nombre: c.nombre || c.telefono, msg: `Pendiente hace ${horas}h`, color: 'text-orange-600', icon: 'fa-clock' });
        }
        // Regla 2: Entregado hace más de 20 días (Re-surtido)
        if (c.estado === 'Entregado' && dias >= 20) {
            alertas.push({ id: c.id, nombre: c.nombre || c.telefono, msg: `Toca re-surtido (${dias}d)`, color: 'text-blue-600', icon: 'fa-arrows-rotate' });
        }
    });

    badge.innerText = alertas.length;
    badge.classList.toggle('hidden', alertas.length === 0);
    document.getElementById('notif-count-text').innerText = alertas.length;

    if (alertas.length === 0) {
        lista.innerHTML = '<p class="text-[10px] text-slate-400 text-center py-6 font-bold">Todo al día ✨</p>';
    }

    alertas.forEach(a => {
        lista.innerHTML += `
            <div class="p-4 bg-white border-b border-slate-50 flex justify-between items-center hover:bg-slate-50 transition-colors">
                <div class="flex items-center gap-3">
                    <div class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                    <div>
                        <b class="text-[11px] text-slate-800">${a.nombre}</b><br>
                        <span class="text-[10px] ${a.color} font-black uppercase tracking-tighter italic"><i class="fa-solid ${a.icon} mr-1"></i>${a.msg}</span>
                    </div>
                </div>
                <button onclick="window.marcarSeguimiento('${a.id}')" class="w-8 h-8 bg-indigo-600 text-white rounded-xl shadow-md hover:scale-110 transition-transform flex items-center justify-center">
                    <i class="fa-solid fa-check text-[10px]"></i>
                </button>
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

setInterval(() => {
    window.renderizarTabla();
    actualizarNotificaciones();
}, 60000);
