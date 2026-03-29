import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyButybOOpJFvO3JaLrl2RaW8NsELSYQxG4",
    authDomain: "dndboutique.firebaseapp.com",
    projectId: "dndboutique",
    storageBucket: "dndboutique.firebasestorage.app",
    messagingSenderId: "1063643456321",
    appId: "1:1063643456321:web:962bdaf55aa082866f77c0",
    measurementId: "G-PFDWRKEJXQ"
};

// --- INICIALIZACIÓN ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const clientesRef = collection(db, "clientes");

let clientesGlobal = [];
let editandoID = null;

// --- REGISTRO DE FUNCIONES GLOBALES (Solución al error de botones) ---
// Registramos todo en window inmediatamente para que el HTML pueda verlos
window.toggleModal = () => {
    editandoID = null;
    const form = document.getElementById('form-cliente');
    if (form) form.reset();
    
    const titulo = document.getElementById('modal-titulo');
    if (titulo) titulo.innerText = "Registrar Venta";
    
    const modal = document.getElementById('modalCliente');
    if (modal) modal.classList.toggle('hidden');
};

window.toggleNotificaciones = () => {
    const panel = document.getElementById('panel-notif');
    if (panel) panel.classList.toggle('hidden');
};

window.abrirEditor = (id) => {
    const cliente = clientesGlobal.find(c => c.id === id);
    if (cliente) {
        editandoID = id;
        document.getElementById('modal-titulo').innerText = "Editar Información";
        
        // Cargar datos en el form
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

window.marcarSeguimiento = async (id) => {
    try {
        await updateDoc(doc(db, "clientes", id), { fechaCambioEstado: Date.now() });
    } catch (e) { console.error(e); }
};

window.eliminarCliente = async (id) => {
    if (confirm('¿Deseas eliminar permanentemente este registro?')) {
        try {
            await deleteDoc(doc(db, "clientes", id));
        } catch (e) { console.error(e); }
    }
};

// --- LÓGICA DE APOYO ---

const formatearTelefono = (num) => {
    if (!num) return "";
    let s = num.toString().replace(/\s/g, "");
    if (s.length === 8) return s.slice(0, 4) + " " + s.slice(4);
    return s;
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

// --- RENDERIZADO DE TABLA ---

window.renderizarTabla = () => {
    const tabla = document.getElementById('tabla-body');
    const buscador = document.getElementById('buscador')?.value.toLowerCase() || "";
    const filtro = document.getElementById('filtro-estado')?.value || "Todos";
    
    if (!tabla) return;
    tabla.innerHTML = '';
    
    let stats = { total: 0, socios: 0, pendientes: 0, envios: 0 };

    clientesGlobal.filter(c => {
        const matchText = (c.nombre || "").toLowerCase().includes(buscador) || 
                          (c.telefono || "").includes(buscador) || 
                          (c.pedido || "").toLowerCase().includes(buscador);
        const matchFiltro = filtro === 'Todos' || c.estado === filtro;
        return matchText && matchFiltro;
    }).forEach(c => {
        const montoNum = parseFloat(c.monto || 0);
        if(c.estado === 'Entregado') { stats.total += montoNum; stats.socios++; }
        if(c.estado === 'Pendiente') stats.pendientes++;
        if(c.estado === 'En Envío') stats.envios++;

        const tiempo = obtenerContador(c.fechaCambioEstado);
        const montoMostrar = (montoNum > 0) ? `$${montoNum.toFixed(2)}` : "-";
        
        const colorClase = 
            c.estado === 'Pendiente' ? 'bg-orange-100 text-orange-700' : 
            c.estado === 'En Envío' ? 'bg-blue-100 text-blue-700' : 
            c.estado === 'Entregado' ? 'bg-green-100 text-green-700' : 
            'bg-slate-100 text-slate-600';

        tabla.innerHTML += `
            <tr class="border-b text-sm hover:bg-slate-50 transition-colors animate-in fade-in duration-300">
                <td class="px-8 py-4">
                    <div class="flex flex-col">
                        <span class="font-bold text-slate-800">${c.nombre || formatearTelefono(c.telefono)}</span>
                        <span class="text-[11px] text-slate-400 italic max-w-[200px] truncate">${c.pedido || 'Sin detalles'}</span>
                    </div>
                </td>
                <td class="px-8 py-4 font-bold text-indigo-600">${montoMostrar}</td>
                <td class="px-8 py-4">
                    <select onchange="window.cambiarEstado('${c.id}', this.value)" class="p-2 rounded-lg ${colorClase} font-bold text-[10px] border-none outline-none cursor-pointer shadow-sm">
                        <option value="Interesado" ${c.estado === 'Interesado' ? 'selected' : ''}>🟡 Interesado</option>
                        <option value="Pendiente" ${c.estado === 'Pendiente' ? 'selected' : ''}>🟠 Pendiente</option>
                        <option value="En Envío" ${c.estado === 'En Envío' ? 'selected' : ''}>🔵 En Envío</option>
                        <option value="Entregado" ${c.estado === 'Entregado' ? 'selected' : ''}>🟢 Entregado</option>
                    </select>
                </td>
                <td class="px-8 py-4 text-center">
                    <span class="text-[10px] font-black text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full uppercase tracking-tighter">${tiempo}</span>
                </td>
                <td class="px-8 py-4">
                    <div class="flex gap-2 justify-center">
                        <button onclick="window.abrirEditor('${c.id}')" class="w-8 h-8 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all">
                            <i class="fa-solid fa-pen text-[10px]"></i>
                        </button>
                        <a href="https://wa.me/503${c.telefono}" target="_blank" class="w-8 h-8 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all">
                            <i class="fa-brands fa-whatsapp text-sm"></i>
                        </a>
                        <button onclick="window.eliminarCliente('${c.id}')" class="w-8 h-8 flex items-center justify-center bg-red-50 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                            <i class="fa-solid fa-trash-can text-[10px]"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
    });

    // Actualizar Dashboards
    document.getElementById('count-pendientes').innerText = stats.pendientes;
    document.getElementById('count-envios').innerText = stats.envios;
    document.getElementById('total-ventas').innerText = `$${stats.total.toFixed(2)}`;
    document.getElementById('count-clientes').innerText = stats.socios;
};

// --- ALERTAS Y NOTIFICACIONES ---

const actualizarNotificaciones = () => {
    const lista = document.getElementById('lista-notificaciones');
    const badge = document.getElementById('notif-badge');
    if(!lista || !badge) return;
    
    lista.innerHTML = '';
    let alertas = [];
    
    clientesGlobal.forEach(c => {
        const horas = Math.floor((Date.now() - (c.fechaCambioEstado || Date.now())) / 3600000);
        const dias = Math.floor(horas / 24);
        if (c.estado === 'Pendiente' && horas >= 24) alertas.push({ id: c.id, nombre: c.nombre || c.telefono, msg: `Sin respuesta (${horas}h)`, color: 'text-orange-600' });
        if (c.estado === 'Entregado' && dias >= 20) alertas.push({ id: c.id, nombre: c.nombre || c.telefono, msg: `Re-surtido (${dias}d)`, color: 'text-red-600' });
    });

    badge.innerText = alertas.length;
    badge.classList.toggle('hidden', alertas.length === 0);
    document.getElementById('notif-count-text').innerText = alertas.length;

    if (alertas.length === 0) {
        lista.innerHTML = '<p class="text-[10px] text-slate-400 text-center py-6 font-bold">No hay alertas activas</p>';
    }

    alertas.forEach(a => {
        lista.innerHTML += `
            <div class="p-3 bg-white border-b border-slate-50 flex justify-between items-center text-[11px] hover:bg-slate-50">
                <div>
                    <b class="${a.color}">${a.nombre}</b><br>
                    <span class="text-slate-400 font-medium">${a.msg}</span>
                </div>
                <button onclick="window.marcarSeguimiento('${a.id}')" class="w-7 h-7 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all">
                    <i class="fa-solid fa-check text-[10px]"></i>
                </button>
            </div>`;
    });
};

// --- ESCUCHA DE FIREBASE ---

onSnapshot(clientesRef, (snapshot) => {
    clientesGlobal = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    clientesGlobal.sort((a, b) => b.fechaCambioEstado - a.fechaCambioEstado);
    window.renderizarTabla();
    actualizarNotificaciones();
});

// --- MANEJO DEL FORMULARIO ---

document.getElementById('form-cliente').addEventListener('submit', async (e) => {
    e.preventDefault();
    const ahora = Date.now();
    const idFinal = editandoID || ahora.toString();
    
    const telRaw = document.getElementById('telefono').value.trim();
    const nombreInput = document.getElementById('nombre').value.trim();
    
    const montoVal = document.getElementById('monto').value;
    const montoFinal = montoVal ? parseFloat(montoVal).toFixed(2) : 0;

    const datos = {
        nombre: nombreInput,
        telefono: telRaw,
        pedido: document.getElementById('pedido').value.trim(),
        monto: montoFinal,
        estado: document.getElementById('estado').value,
        observaciones: document.getElementById('observaciones').value.trim(),
        fechaCambioEstado: editandoID ? (clientesGlobal.find(c => c.id === editandoID)?.fechaCambioEstado || ahora) : ahora
    };

    try {
        await setDoc(doc(db, "clientes", idFinal), datos, { merge: true });
        window.toggleModal();
    } catch (err) {
        console.error(err);
        alert("Error al conectar con la nube. Revisa tu conexión.");
    }
});

// Refrescar cada minuto para actualizar los tiempos (1m, 2h, etc)
setInterval(() => window.renderizarTabla(), 60000);
