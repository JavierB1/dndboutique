/**
 * DND Boutique CRM - Lógica de Negocio Mayorista
 * Sistema de Doble Cronómetro y Notificaciones Inteligentes
 */

let clientes = JSON.parse(localStorage.getItem('dnd_boutique_db')) || [];

document.addEventListener('DOMContentLoaded', () => {
    renderizarTabla();
    actualizarNotificaciones();
});

function toggleModal() {
    document.getElementById('modalCliente').classList.toggle('hidden');
}

function toggleNotificaciones() {
    document.getElementById('panel-notif').classList.toggle('hidden');
}

document.getElementById('form-cliente').addEventListener('submit', function(e) {
    e.preventDefault();
    const ahora = new Date().getTime();
    const nuevo = {
        id: Date.now(),
        nombre: document.getElementById('nombre').value.trim(),
        telefono: document.getElementById('telefono').value.trim(),
        pedido: document.getElementById('pedido').value.trim(),
        monto: parseFloat(document.getElementById('monto').value || 0).toFixed(2),
        estado: document.getElementById('estado').value,
        fechaCambioEstado: ahora
    };
    clientes.unshift(nuevo);
    guardarYRenderizar();
    this.reset();
    toggleModal();
});

function cambiarEstado(id, nuevoEstado) {
    const index = clientes.findIndex(c => c.id === id);
    if (index !== -1) {
        clientes[index].estado = nuevoEstado;
        clientes[index].fechaCambioEstado = new Date().getTime();
        guardarYRenderizar();
    }
}

function eliminarCliente(id) {
    if(confirm('¿Eliminar este registro de DND Boutique?')) {
        clientes = clientes.filter(c => c.id !== id);
        guardarYRenderizar();
    }
}

function guardarYRenderizar() {
    localStorage.setItem('dnd_boutique_db', JSON.stringify(clientes));
    renderizarTabla();
    actualizarNotificaciones();
}

function calcularHoras(fechaAnterior) {
    const hoy = new Date().getTime();
    return Math.floor((hoy - fechaAnterior) / (1000 * 60 * 60));
}

/** * GESTIÓN DE ALERTAS (BURBUJA SUPERIOR)
 */
function actualizarNotificaciones() {
    const lista = document.getElementById('lista-notificaciones');
    const badge = document.getElementById('notif-badge');
    const countText = document.getElementById('notif-count-text');
    lista.innerHTML = '';
    
    let alertas = [];

    clientes.forEach(c => {
        const horas = calcularHoras(c.fechaCambioEstado);
        const dias = Math.floor(horas / 24);

        // Alerta de Seguimiento (Pendientes > 24 Horas)
        if (c.estado === 'Pendiente' && horas >= 24) {
            alertas.push({
                nombre: c.nombre,
                msg: `Lleva ${horas}h sin concretar venta.`,
                color: 'text-orange-600',
                icon: 'fa-hourglass-half',
                wa: c.telefono
            });
        }
        // Alerta de Resurtido (Entregados > 20 Días)
        if (c.estado === 'Entregado' && dias >= 20) {
            alertas.push({
                nombre: c.nombre,
                msg: `Hace ${dias} días de su última carga.`,
                color: 'text-red-600',
                icon: 'fa-rotate',
                wa: c.telefono
            });
        }
    });

    if (alertas.length > 0) {
        badge.innerText = alertas.length;
        badge.classList.remove('hidden');
        countText.innerText = `${alertas.length} Casos Críticos`;
        
        alertas.forEach(a => {
            lista.innerHTML += `
                <div class="p-3 hover:bg-slate-50 rounded-2xl border border-slate-50 transition-all flex justify-between items-center">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center ${a.color}">
                            <i class="fa-solid ${a.icon} text-[10px]"></i>
                        </div>
                        <div>
                            <p class="text-[11px] font-black text-slate-800 leading-none">${a.nombre}</p>
                            <p class="text-[9px] font-bold text-slate-400 mt-1">${a.msg}</p>
                        </div>
                    </div>
                    <a href="https://wa.me/503${a.wa}" target="_blank" class="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all">
                        <i class="fa-brands fa-whatsapp text-xs"></i>
                    </a>
                </div>`;
        });
    } else {
        badge.classList.add('hidden');
        countText.innerText = 'Todo al día';
        lista.innerHTML = '<p class="p-8 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sin alertas pendientes ✨</p>';
    }
}

/**
 * RENDERIZADO DE TABLA Y MÉTRICAS
 */
function renderizarTabla() {
    const buscador = document.getElementById('buscador').value.toLowerCase();
    const filtroEstado = document.getElementById('filtro-estado').value;
    const tabla = document.getElementById('tabla-body');
    tabla.innerHTML = '';
    
    let totalCaja = 0;
    let pendientesCount = 0;
    let sociosConfirmados = 0; // CONTADOR PARA SOCIOS REALES

    const filtrados = clientes.filter(c => {
        const matchBusqueda = c.nombre.toLowerCase().includes(buscador) || c.telefono.includes(buscador);
        const matchEstado = filtroEstado === 'Todos' || c.estado === filtroEstado;
        return matchBusqueda && matchEstado;
    });

    filtrados.forEach(c => {
        // LÓGICA DE MÉTRICAS (SOLO ENTREGADO = SOCIO)
        if(c.estado === 'Entregado') {
            totalCaja += parseFloat(c.monto);
            sociosConfirmados++; 
        }
        if(c.estado === 'Pendiente') pendientesCount++;

        const horas = calcularHoras(c.fechaCambioEstado);
        const dias = Math.floor(horas / 24);
        
        let cronoHTML = '';
        let colorSel = '';

        if (c.estado === 'Pendiente') {
            colorSel = 'bg-orange-100 text-orange-700 border-orange-200';
            const alert = horas >= 24 ? 'text-red-600 font-black animate-pulse' : 'text-orange-500';
            cronoHTML = `<span class="${alert} text-[10px]">⏳ ${horas}h</span>`;
        } else if (c.estado === 'Entregado') {
            colorSel = 'bg-green-100 text-green-700 border-green-200';
            const alert = dias >= 20 ? 'text-red-600 font-black animate-pulse' : 'text-green-600';
            cronoHTML = `<span class="${alert} text-[10px]">🛒 Hace ${dias} d</span>`;
        } else {
            colorSel = 'bg-slate-100 text-slate-500 border-slate-200';
            cronoHTML = `<span class="text-slate-300 text-[10px]">Sin Venta</span>`;
        }

        tabla.innerHTML += `
            <tr class="hover:bg-slate-50/50 transition-all border-b border-slate-50">
                <td class="px-8 py-5">
                    <div class="font-black text-slate-800">${c.nombre}</div>
                    <div class="text-[10px] text-slate-400 italic">${c.pedido || '-'}</div>
                </td>
                <td class="px-8 py-5 font-black text-slate-900">$${c.monto}</td>
                <td class="px-8 py-5">
                    <select onchange="cambiarEstado(${c.id}, this.value)" class="px-3 py-1.5 text-[10px] font-black rounded-xl uppercase border cursor-pointer outline-none ${colorSel}">
                        <option value="Interesado" ${c.estado === 'Interesado' ? 'selected' : ''}>🟡 Interesado</option>
                        <option value="Pendiente" ${c.estado === 'Pendiente' ? 'selected' : ''}>🟠 Pendiente</option>
                        <option value="Entregado" ${c.estado === 'Entregado' ? 'selected' : ''}>🟢 Entregado</option>
                    </select>
                </td>
                <td class="px-8 py-5 text-center">${cronoHTML}</td>
                <td class="px-8 py-5 text-center flex justify-center gap-2">
                    <a href="https://wa.me/503${c.telefono}" target="_blank" class="btn-ws"><i class="fa-brands fa-whatsapp text-lg"></i></a>
                    <button onclick="eliminarCliente(${c.id})" class="text-slate-200 hover:text-red-400 p-2"><i class="fa-solid fa-trash-can text-xs"></i></button>
                </td>
            </tr>`;
    });

    // ACTUALIZACIÓN DE INDICADORES SUPERIORES
    document.getElementById('count-pendientes').innerText = pendientesCount;
    document.getElementById('total-ventas').innerText = `$${totalCaja.toFixed(2)}`;
    document.getElementById('count-clientes').innerText = sociosConfirmados; // SOLO "ENTREGADOS"
}

function filtrarClientes() { renderizarTabla(); }