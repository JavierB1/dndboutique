// ... (mismo encabezado y funciones de window anteriores)

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
                          (c.pedido || "").toLowerCase().includes(buscador) ||
                          (c.observaciones || "").toLowerCase().includes(buscador);
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
                    <div class="flex flex-col gap-0.5">
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-slate-800 text-base">${c.nombre || formatearTelefono(c.telefono)}</span>
                            ${c.observaciones ? '<i class="fa-solid fa-note-sticky text-amber-400 text-[10px]" title="Tiene notas"></i>' : ''}
                        </div>
                        <span class="text-[11px] text-indigo-500 font-bold italic max-w-[250px] truncate">${c.pedido || 'Sin detalles de pedido'}</span>
                        ${c.observaciones ? `<span class="text-[10px] text-slate-400 font-medium leading-tight mt-1 border-l-2 border-amber-200 pl-2 py-0.5">${c.observaciones}</span>` : ''}
                    </div>
                </td>
                <td class="px-8 py-4 font-bold text-slate-700">${montoMostrar}</td>
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

    // ... (actualización de estadísticas igual a la versión anterior)
};
// ...
