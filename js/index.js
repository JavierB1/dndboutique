import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyButybOOpJFvO3JaLrl2RaW8NsELSYQxG4",
  authDomain: "dndboutique.firebaseapp.com",
  projectId: "dndboutique",
  storageBucket: "dndboutique.firebasestorage.app",
  messagingSenderId: "1063643456321",
  appId: "1:1063643456321:web:962bdaf55aa082866f77c0",
  measurementId: "G-PFDWRKEJXQ"
};

// Inicialización de servicios
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const clientesRef = collection(db, "clientes");

let clientesGlobal = [];
let editandoID = null;

// --- REGISTRO DE FUNCIONES GLOBALES (Para que el HTML las vea) ---
// Esto debe ir antes de cualquier otra lógica para asegurar que los botones funcionen siempre.

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
        const titulo = document.getElementById('modal-titulo');
        if (titulo) titulo.innerText = "Editar Información";
        
        const telFormateado = formatearTelefono(cliente.telefono);
        
        // Llenado de campos con validación de existencia
        if(document.getElementById('nombre')) document.getElementById('nombre').value = (cliente.nombre === telFormateado) ? "" : (cliente.nombre || "");
        if(document.getElementById('telefono')) document.getElementById('telefono').value = cliente.telefono || "";
        if(document.getElementById('pedido')) document.getElementById('pedido').value = cliente.pedido || "";
        if(document.getElementById('monto')) document.getElementById('monto').value = (cliente.monto && cliente.monto != 0) ? cliente.monto : "";
        if(document.getElementById('estado')) document.getElementById('estado').value = cliente.estado || "Interesado";
        if(document.getElementById('observaciones')) document.getElementById('observaciones').value = cliente.observaciones || "";
        
        const modal = document.getElementById('modalCliente');
        if (modal) modal.classList.remove('hidden');
    }
};

window.cambiarEstado = async (id, nuevoEstado) => {
    try {
        await updateDoc(doc(db, "clientes", id), {
            estado: nuevoEstado,
            fechaCambioEstado: Date.now()
        });
    } catch (e) { console.error("Error al cambiar estado:", e); }
};

window.marcarSeguimiento = async (id) => {
    try {
        await updateDoc(doc(db, "clientes", id), { fechaCambioEstado: Date.now() });
    } catch (e) { console.error("Error en seguimiento:", e); }
};

window.eliminarCliente = async (id) => {
    if (confirm('¿Estás seguro de eliminar este registro?')) {
        try {
            await deleteDoc(doc(db, "clientes", id));
        } catch (e) { console.error("Error al eliminar:", e); }
    }
};

// --- FUNCIONES DE APOYO ---

const formatearTelefono = (num) => {
    if (!num) return "";
    const s = num.toString().replace(/\s/g, "");
    return s.length === 8 ? s.slice(0, 4) + " " + s.slice(4) : s;
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

const renderizarTabla = () => {
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
            <tr class="border-b text-sm hover:bg-slate-50 transition-colors">
                <td class="p-4">
                    <div class="flex flex-col">
                        <span class="font-bold text-slate-800">${c.nombre}</span>
                        <span class="text-[11px] text-slate-400 italic">${c.pedido || 'Sin detalles'}</span>
                    </div>
                </td>
                <td class="p-4 font-bold text-slate-700">${montoMostrar}</td>
                <td class="p-4">
                    <select onchange="window.cambiarEstado('${c.id}', this.value)" class="p-2 rounded-lg ${colorClase} font-bold text-[10px] border-none outline-none cursor-pointer shadow-sm">
                        <option value="Interesado" ${c.estado === 'Interesado' ? 'selected' : ''}>🟡 Interesado</option>
                        <option value="Pendiente" ${c.estado === 'Pendiente' ? 'selected' : ''}>🟠 Pendiente</option>
                        <option value="En Envío" ${c.estado === 'En Envío' ? 'selected' : ''}>🔵 En Envío</option>
                        <option value="Entregado" ${c.estado === 'Entregado' ? 'selected' : ''}>🟢 Entregado</option>
                    </select>
                </td>
                <td class="p-4 text-center"><span class="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">${tiempo}</span></td>
                <td class="p-4">
                    <div class="flex gap-2 justify-center">
                        <button onclick="window.abrirEditor('${c.id}')" class="w-9 h-9 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                            <i class="fa-solid fa-pen text-xs"></i>
                        </button>
                        <a href="https://wa.me/503${c.telefono}" target="_blank" class="w-9 h-9 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm">
                            <i class="fa-brands fa-whatsapp text-lg"></i>
                        </a>
                        <button onclick="window.eliminarCliente('${c.id}')" class="w-9 h-9 flex items-center justify-center bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm">
                            <i class="fa-solid fa-trash-can text-xs"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
    });

    // Actualización segura de elementos de UI
    if(document.getElementById('count-pendientes')) document.getElementById('count-pendientes').innerText = stats.pendientes;
    if(document.getElementById('count-envios')) document.getElementById('count-envios').innerText = stats.envios;
    if(document.getElementById('total-ventas')) document.getElementById('total-ventas').innerText = `$${stats.total.toFixed(2)}`;
    if(document.getElementById('count-clientes')) document.getElementById('count-clientes').innerText = stats.socios;
};

window.renderizarTabla = renderizarTabla;

const actualizarNotificaciones = () => {
    const lista = document.getElementById('lista-notificaciones');
    const badge = document.getElementById('notif-badge');
    const countText = document.getElementById('notif-count-text');
    
    if(!lista || !badge) return;
    
    lista.innerHTML = '';
    let alertas = [];
    
    clientesGlobal.forEach(c => {
        const horas = Math.floor((Date.now() - (c.fechaCambioEstado || Date.now())) / 3600000);
        const dias = Math.floor(horas / 24);
        if (c.estado === 'Pendiente' && horas >= 24) alertas.push({ id: c.id, nombre: c.nombre, msg: `Sin respuesta (${horas}h)`, color: 'text-orange-600' });
        if (c.estado === 'Entregado' && dias >= 20) alertas.push({ id: c.id, nombre: c.nombre, msg: `Re-surtido (${dias}d)`, color: 'text-red-600' });
    });

    badge.innerText = alertas.length;
    badge.classList.toggle('hidden', alertas.length === 0);
    if(countText) countText.innerText = alertas.length;

    if (alertas.length === 0) {
        lista.innerHTML = '<p class="text-[10px] text-slate-400 text-center py-4">No hay alertas pendientes</p>';
    }

    alertas.forEach(a => {
        lista.innerHTML += `
            <div class="p-3 bg-white border-b flex justify-between items-center text-[11px]">
                <div><b class="${a.color}">${a.nombre}</b><br><span class="text-slate-400 font-medium">${a.msg}</span></div>
                <button onclick="window.marcarSeguimiento('${a.id}')" class="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-colors"><i class="fa-solid fa-check"></i></button>
            </div>`;
    });
};

// --- ESCUCHA DE DATOS ---

onSnapshot(clientesRef, (snapshot) => {
    clientesGlobal = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    clientesGlobal.sort((a, b) => b.id - a.id);
    renderizarTabla();
    actualizarNotificaciones();
});

// --- MANEJO DEL FORMULARIO ---

const formulario = document.getElementById('form-cliente');
if (formulario) {
    formulario.addEventListener('submit', async (e) => {
        e.preventDefault();
        const ahora = Date.now();
        const idFinal = editandoID || ahora.toString();
        
        const telRaw = document.getElementById('telefono').value.trim();
        const nombreInput = document.getElementById('nombre').value.trim();
        const nombreFinal = nombreInput || formatearTelefono(telRaw);
        
        const montoVal = document.getElementById('monto').value;
        const montoFinal = montoVal ? parseFloat(montoVal).toFixed(2) : 0;

        const datos = {
            nombre: nombreFinal,
            telefono: telRaw,
            pedido: document.getElementById('pedido').value.trim(),
            monto: montoFinal,
            estado: document.getElementById('estado').value,
            observaciones: document.getElementById('observaciones').value.trim()
        };

        if (!editandoID) datos.fechaCambioEstado = ahora;

        try {
            await setDoc(doc(db, "clientes", idFinal), datos, { merge: true });
            window.toggleModal();
        } catch (err) {
            console.error("Error al guardar:", err);
            alert("Error al guardar. Verifica tu conexión.");
        }
    });
}

// Actualización automática de contadores de tiempo
setInterval(() => renderizarTabla(), 60000);
