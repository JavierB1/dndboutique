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

// Escuchar cambios en tiempo real
onSnapshot(clientesRef, (snapshot) => {
    clientes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Ordenar por ID (tiempo de creación) de más reciente a más antiguo
    clientes.sort((a, b) => b.id - a.id);
    renderizarTabla();
    actualizarNotificaciones();
}, (error) => {
    console.error("Error en Snapshot:", error);
});

// Abrir/Cerrar Modal
window.toggleModal = () => {
    editandoID = null;
    document.getElementById('form-cliente').reset();
    document.getElementById('modal-titulo').innerText = "Registrar Venta";
    document.getElementById('modalCliente').classList.toggle('hidden');
};

// Función para formatear teléfono (ej: 77889900 -> 7788 9900)
function formatearTelefono(num) {
    if (!num) return "";
    const s = num.toString().replace(/\s/g, "");
    return s.length === 8 ? s.slice(0, 4) + " " + s.slice(4) : s;
}

// Cargar datos para editar
window.abrirEditor = (id) => {
    const cliente = clientes.find(c => c.id == id.toString());
    if (cliente) {
        editandoID = id.toString();
        document.getElementById('modal-titulo').innerText = "Editar Información";
        
        const telFormateado = formatearTelefono(cliente.telefono);
        // Si el nombre guardado es igual al teléfono formateado, lo dejamos vacío en el input
        document.getElementById('nombre').value = (cliente.nombre === telFormateado) ? "" : (cliente.nombre || "");
        document.getElementById('telefono').value = cliente.telefono || "";
        document.getElementById('pedido').value = cliente.pedido || "";
        document.getElementById('monto').value = (cliente.monto && cliente.monto != 0) ? cliente.monto : "";
        document.getElementById('estado').value = cliente.estado || "Interesado";
        document.getElementById('observaciones').value = cliente.observaciones || "";
        
        document.getElementById('modalCliente').classList.remove('hidden');
    }
};

// Guardar o Actualizar
document.getElementById('form-cliente').addEventListener('submit', async (e) => {
    e.preventDefault();
    const ahora = Date.now();
    const idUnico = editandoID || ahora.toString();
    const telRaw = document.getElementById('telefono').value.trim();
    const nombreInput = document.getElementById('nombre').value.trim();
    
    // Lógica de nombre: Si está vacío, usa el teléfono
    const nombreFinal = nombreInput || formatearTelefono(telRaw);
    
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

    // Solo actualizar fecha de estado si es nuevo registro
    if (!editandoID) datos.fechaCambioEstado = ahora;

    try {
        await setDoc(doc(db, "clientes", idUnico), datos, { merge: true });
        window.toggleModal();
    } catch (error) {
        console.error("Error al guardar:", error);
    }
});

// Cambiar estado directo desde la tabla
window.cambiarEstado = async (id, nuevoEstado) => {
    try {
        await updateDoc(doc(db, "clientes", id.toString()), {
            estado: nuevoEstado,
            fechaCambioEstado: Date.now()
        });
    } catch (error) {
        console.error("Error al cambiar estado:", error);
    }
};

window.marcarSeguimiento = async (id) => {
    await updateDoc(doc(db, "clientes", id.toString()), { fechaCambioEstado: Date.now() });
};

window.eliminarCliente = async (id) => {
    if (confirm('¿Eliminar este registro permanentemente?')) {
        await deleteDoc(doc(db, "clientes", id.toString()));
    }
};

function obtenerContador(inicio) {
    if (!inicio) return "-";
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
        const tiempo = c.fechaCambioEstado || Date.now();
        const horas = Math.floor((Date.now() - tiempo) / 3600000);
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

    const filtrados = clientes.filter(c => {
        const matchText = (c.nombre || "").toLowerCase().includes(buscador) || (c.telefono || "").includes(buscador) || (c.observaciones || "").toLowerCase().includes(buscador);
        const matchFiltro = filtro === 'Todos' || c.estado === filtro;
        return matchText && matchFiltro;
    });

    filtrados.forEach(c => {
        const montoNum = parseFloat(c.monto || 0);
        if(c.estado === 'Entregado') { stats.total += montoNum; stats.socios++; }
        if(c.estado === 'Pendiente') stats.pendientes++;
        if(c.estado === 'En Envío') stats.envios++;

        const tiempo = obtenerContador(c.fechaCambioEstado);
        
        // Colores para el selector
        const colorSel = c.estado === 'Pendiente' ? 'bg-orange-100 text-orange-700' : 
                         c.estado === 'En Envío' ? 'bg-blue-100 text-blue-700' : 
                         c.estado === 'Entregado' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600';

        const montoMostrar = (montoNum > 0) ? `$${montoNum.toFixed(2)}` : "-";

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
                    <select onchange="cambiarEstado('${c.id}', this.value)" class="p-2 rounded-lg ${colorSel} font-bold text-[10px] border-none outline-none cursor-pointer">
                        <option value="Interesado" ${c.estado === 'Interesado' ? 'selected' : ''}>🟡 Interesado</option>
                        <option value="Pendiente" ${c.estado === 'Pendiente' ? 'selected' : ''}>🟠 Pendiente</option>
                        <option value="En Envío" ${c.estado === 'En Envío' ? 'selected' : ''}>🔵 En Envío</option>
                        <option value="Entregado" ${c.estado === 'Entregado' ? 'selected' : ''}>🟢 Entregado</option>
                    </select>
                </td>
                <td class="p-4 text-center"><span class="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">${tiempo}</span></td>
                <td class="p-4">
                    <div class="flex gap-2 justify-center">
                        <button onclick="abrirEditor('${c.id}')" class="w-8 h-8 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all">
                            <i class="fa-solid fa-pen text-xs"></i>
                        </button>
                        <a href="https://wa.me/503${c.telefono}" target="_blank" class="w-8 h-8 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all">
                            <i class="fa-brands fa-whatsapp text-xs"></i>
                        </a>
                        <button onclick="eliminarCliente('${c.id}')" class="w-8 h-8 flex items-center justify-center bg-red-50 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                            <i class="fa-solid fa-trash text-xs"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
    });

    // Actualizar contadores
    document.getElementById('count-pendientes').innerText = stats.pendientes;
    document.getElementById('count-envios').innerText = stats.envios;
    document.getElementById('total-ventas').innerText = `$${stats.total.toFixed(2)}`;
    document.getElementById('count-clientes').innerText = stats.socios;
}

// Refrescar tiempos cada minuto
setInterval(() => renderizarTabla(), 60000);
