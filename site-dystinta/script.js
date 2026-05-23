const DEFAULT_DATA = {
  general:{companyName:'Dystinta', slogan:'Serigrafía, DTF Textil y DTF UV', whatsapp:'+595982317317', whatsappRaw:'595982317317', instagram:'https://www.instagram.com/dystintapy/', facebook:'https://www.facebook.com/sshirleybittar', tiktok:'', email:'', address:'Asunción, Paraguay', map:'https://www.google.com/maps?q=Asuncion+Paraguay&output=embed'},
  home:{title:'Impresión profesional para marcas, emprendimientos y eventos', subtitle:'Creamos soluciones en serigrafía y DTF con atención personalizada, asesoramiento de diseño y producción a medida.', heroNote:'Atendemos pedidos por WhatsApp, formulario web y panel interno.', video1:'DTF Textil', video2:'DTF UV', video3:'Serigrafía'},
  about:{title:'Asesoría', text:'Guía práctica para trabajar con serigrafía, sublimación y DTF: temperaturas, tiempos, materiales recomendados, color y preparación de archivos.'},
  services:{title:'Servicios', textil:'Impresión DTF Textil ideal para remeras, uniformes, promociones y producciones personalizadas.', uv:'DTF UV para etiquetas, packaging, objetos rígidos y branding de productos.', serigrafia:'Serigrafía para volumen, eventos, campañas y prendas con excelente durabilidad.'},
  designs:{title:'Diseños', text:'Mostrá ideas, catálogos, mockups, plantillas y propuestas visuales para tus clientes.'},
  calc:{title:'Calculadora DTF', pricePerCm2:150, minCharge:25000, extraRush:15000},
  contact:{title:'Contacto', text:'Escribinos para cotizaciones, pedidos o consultas de diseño.'}
};
const DEFAULT_USERS = [
  {username:'admin',password:'admin123',role:'admin',name:'Administrador'},
  {username:'designer1',password:'disenador123',role:'designer',name:'Diseñador 1'},
  {username:'designer2',password:'disenador123',role:'designer',name:'Diseñador 2'}
];

const MEDIA_DB_NAME='dystinta_media_db';
const MEDIA_STORE='files';
function openMediaDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(MEDIA_DB_NAME,1);
    req.onupgradeneeded=()=>{ if(!req.result.objectStoreNames.contains(MEDIA_STORE)) req.result.createObjectStore(MEDIA_STORE); };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function saveMediaFile(key,file){ const db=await openMediaDB(); return new Promise((resolve,reject)=>{ const tx=db.transaction(MEDIA_STORE,'readwrite'); tx.objectStore(MEDIA_STORE).put(file,key); tx.oncomplete=()=>resolve(true); tx.onerror=()=>reject(tx.error); }); }
async function getMediaFile(key){ const db=await openMediaDB(); return new Promise((resolve,reject)=>{ const tx=db.transaction(MEDIA_STORE,'readonly'); const req=tx.objectStore(MEDIA_STORE).get(key); req.onsuccess=()=>resolve(req.result||null); req.onerror=()=>reject(req.error); }); }
async function deleteMediaFile(key){ const db=await openMediaDB(); return new Promise((resolve,reject)=>{ const tx=db.transaction(MEDIA_STORE,'readwrite'); tx.objectStore(MEDIA_STORE).delete(key); tx.oncomplete=()=>resolve(true); tx.onerror=()=>reject(tx.error); }); }
function getData(){return JSON.parse(localStorage.getItem('dystinta_site_data')||'null')||structuredClone(DEFAULT_DATA)}
function saveData(data){localStorage.setItem('dystinta_site_data',JSON.stringify(data))}
function getOrders(){return JSON.parse(localStorage.getItem('dystinta_orders')||'[]')}
function saveOrders(data){localStorage.setItem('dystinta_orders',JSON.stringify(data))}
function getUsers(){return JSON.parse(localStorage.getItem('dystinta_users')||'null')||structuredClone(DEFAULT_USERS)}
function saveUsers(data){localStorage.setItem('dystinta_users',JSON.stringify(data))}
function initStorage(){if(!localStorage.getItem('dystinta_site_data')) saveData(structuredClone(DEFAULT_DATA)); if(!localStorage.getItem('dystinta_users')) saveUsers(structuredClone(DEFAULT_USERS)); if(!localStorage.getItem('dystinta_orders')) saveOrders([])}
function renderSharedFooter(){
  const currentPage=window.location.pathname.split('/').pop()||'index.html';
  if(['admin.html','panel.html'].includes(currentPage)) return;
  const footerMarkup=`<footer class="footer footer-rich"><div class="container footer-rich-grid"><div><strong class="footer-brand" data-company></strong><p class="footer-copy">Centro de impresión y personalización con enfoque comercial para textiles, objetos rígidos y producción visual. Datos simulados para maqueta.</p><div class="footer-badge-row"><span class="home-chip">DTF Textil</span><span class="home-chip">DTF UV</span><span class="home-chip">Serigrafía</span></div></div><div><h4>Contacto de atención</h4><ul class="footer-list"><li>Atención al cliente: +595 981 000 444</li><li>Ventas corporativas: +595 981 000 555</li><li>Correo: hola@dystinta.demo</li></ul></div><div><h4>Showroom</h4><ul class="footer-list"><li>Av. Creativa 2450</li><li>Asunción, Paraguay</li><li>Lunes a Viernes, 08:30 a 18:00</li></ul></div><div><h4>Seguinos</h4><div class="socials"><a class="social" data-whatsapp-link href="#">WhatsApp</a><a class="social" data-instagram-link href="#" target="_blank">Instagram</a><a class="social" data-facebook-link href="#" target="_blank">Facebook</a></div></div></div><div class="container footer-bottom"><span>Copyright © Dystinta Impresión & Personalización</span><span>Home inspirado en referencia comercial, adaptado a la identidad actual.</span></div></footer>`;
  const existingFooter=document.querySelector('footer');
  if(existingFooter){
    existingFooter.outerHTML=footerMarkup;
    return;
  }
  document.body.insertAdjacentHTML('beforeend',footerMarkup);
}
function applyCommon(){initStorage(); renderSharedFooter(); const data=getData(); document.querySelectorAll('[data-company]').forEach(el=>el.textContent=data.general.companyName); document.querySelectorAll('[data-slogan]').forEach(el=>el.textContent=data.general.slogan); document.querySelectorAll('[data-whatsapp-link]').forEach(el=>el.href='https://wa.me/'+data.general.whatsappRaw); document.querySelectorAll('[data-instagram-link]').forEach(el=>el.href=data.general.instagram||'#'); document.querySelectorAll('[data-facebook-link]').forEach(el=>el.href=data.general.facebook||'#'); document.querySelectorAll('[data-address]').forEach(el=>el.textContent=data.general.address||''); document.querySelectorAll('[data-home-title]').forEach(el=>el.textContent=data.home.title); document.querySelectorAll('[data-home-subtitle]').forEach(el=>el.textContent=data.home.subtitle); document.querySelectorAll('[data-video-caption="1"]').forEach(el=>el.textContent=data.home.video1); document.querySelectorAll('[data-video-caption="2"]').forEach(el=>el.textContent=data.home.video2); document.querySelectorAll('[data-video-caption="3"]').forEach(el=>el.textContent=data.home.video3); const map=document.querySelector('[data-map]'); if(map) map.src=data.general.map||'';}
function sendOrderToWhatsApp(order){ const d=getData(); const txt = `Nuevo pedido Dystinta%0AServicio: ${encodeURIComponent(order.service)}%0ANombre: ${encodeURIComponent(order.name)}%0ATeléfono: ${encodeURIComponent(order.phone)}%0ACantidad: ${encodeURIComponent(order.quantity||'')}%0ADetalles: ${encodeURIComponent(order.details||'')}%0AArchivo: ${encodeURIComponent(order.fileName||'Sin archivo')}`; window.open(`https://wa.me/${d.general.whatsappRaw}?text=${txt}`,'_blank'); }
function initOrderForms(){ document.querySelectorAll('.order-form').forEach(form=>{ form.addEventListener('submit',e=>{ e.preventDefault(); const fd = new FormData(form); const order = { id:Date.now(), createdAt:new Date().toLocaleString(), service:fd.get('service'), name:fd.get('name'), phone:fd.get('phone'), email:fd.get('email'), quantity:fd.get('quantity'), details:fd.get('details'), fileName:(fd.get('file') && fd.get('file').name) || 'Sin archivo', status:'Nuevo', assignedTo:'', notes:''}; const orders=getOrders(); orders.unshift(order); saveOrders(orders); form.reset(); alert('Pedido guardado correctamente. También podés enviarlo por WhatsApp.'); sendOrderToWhatsApp(order); }); }); }
function initCalculator(){
  const itemsHost=document.getElementById('calcItems');
  if(!itemsHost) return;
  const materialWidthInput=document.getElementById('materialWidth');
  const separationWidthInput=document.getElementById('separationWidth');
  const paddingInput=document.getElementById('padding');
  const result=document.getElementById('calcResult');
  const repetitions=document.getElementById('calcRepetitions');
  const canvas=document.getElementById('calcCanvas');
  const addBtn=document.getElementById('addCalcItem');
  const clearBtn=document.getElementById('clearCalcItems');
  const palette=['#8b4bff','#6a2db8','#35d07f','#ffcc66','#ff7f9b','#d7b8ff'];
  let colorIndex=0;
  let items=[createCalcItem()];

  function createCalcItem(){
    const color=palette[colorIndex%palette.length];
    colorIndex+=1;
    return {width:21,height:21,repeated:1,color};
  }
  function parseNumber(value,fallback=0){
    const normalized=String(value??'').replace(',', '.');
    const parsed=Number(normalized);
    return Number.isFinite(parsed)?parsed:fallback;
  }
  function formatMetric(value){
    return Number(value||0).toLocaleString('es-PY',{minimumFractionDigits:0,maximumFractionDigits:2});
  }
  function renderItems(){
    itemsHost.innerHTML=items.map((item,index)=>`
      <article class="calc-item card">
        <div class="calc-item-fields">
          <label>Ancho (cm)<input data-calc-field="width" data-index="${index}" type="number" min="0.01" step="0.01" value="${item.width}"></label>
          <label>Alto (cm)<input data-calc-field="height" data-index="${index}" type="number" min="0.01" step="0.01" value="${item.height}"></label>
          <label>Repeticiones<input data-calc-field="repeated" data-index="${index}" type="number" min="1" step="1" value="${item.repeated}"></label>
          <button class="btn soft small" data-calc-remove="${index}" type="button">Eliminar</button>
        </div>
        <div class="calc-item-preview">
          <div class="calc-preview-box" style="width:${Math.max(item.width,2.4)}px;height:${Math.max(item.height,2.4)}px;background:${item.color}"></div>
          <span class="hint">${formatMetric(item.width)} × ${formatMetric(item.height)} cm</span>
        </div>
      </article>
    `).join('');
  }
  function expandItems(){
    const gap=parseNumber(separationWidthInput.value,1);
    return items.flatMap(item=>{
      const repeated=Math.max(1,Math.round(parseNumber(item.repeated,1)));
      return Array.from({length:repeated},()=>({
        width:parseNumber(item.width,0)+gap,
        height:parseNumber(item.height,0)+gap,
        color:item.color
      }));
    });
  }
  function canFit(space,box){
    return (space.width>=box.width&&space.height>=box.height)||(space.width>=box.height&&space.height>=box.width);
  }
  function pickSpace(box,spaces){
    return spaces.reduce((best,space,index,all)=>canFit(space,box)&&(best===-1||canFit(all[best],space))?index:best,-1);
  }
  function packBoxes(boxes,materialWidth){
    const spaces=[{x:0,y:0,width:materialWidth,height:Number.POSITIVE_INFINITY}];
    const packed=[];
    boxes.slice().sort((a,b)=>Math.max(b.width,b.height)-Math.max(a.width,a.height)).forEach(originalBox=>{
      let box={...originalBox};
      let slotIndex=pickSpace(box,spaces);
      if(slotIndex===-1) return;
      const slot=spaces[slotIndex];
      if((box.width>slot.width||box.height>slot.height)&&canFit(slot,{width:box.height,height:box.width})){
        box={...box,width:box.height,height:box.width};
      }
      packed.push({box,x:slot.x,y:slot.y});
      if(box.width===slot.width&&box.height===slot.height){
        spaces.splice(slotIndex,1);
      }else if(box.height===slot.height){
        slot.x+=box.width;
        slot.width-=box.width;
      }else if(box.width===slot.width){
        slot.y+=box.height;
        slot.height-=box.height;
      }else{
        spaces.push({x:slot.x+box.width,y:slot.y,width:slot.width-box.width,height:box.height});
        slot.y+=box.height;
        slot.height-=box.height;
      }
      for(let i=spaces.length-1;i>=0;i--){
        for(let j=spaces.length-1;j>=0;j--){
          if(i===j) continue;
          if(spaces[i].x===spaces[j].x){
            if(spaces[i].y<spaces[j].y){
              spaces[i].height+=spaces[j].height;
              spaces.splice(j,1);
            }else{
              spaces[j].height+=spaces[i].height;
              spaces.splice(i,1);
              break;
            }
          }
        }
      }
    });
    return {packed,spaces};
  }
  function drawCanvas(layout,usableWidth){
    const ctx=canvas.getContext('2d');
    if(!ctx) return {heightCm:0};
    const totalHeight=layout.packed.reduce((max,item)=>Math.max(max,item.y+item.box.height),0);
    const scale=usableWidth>0?Math.min(520,usableWidth)/usableWidth:1;
    canvas.width=Math.max(usableWidth,1);
    canvas.height=Math.max(totalHeight,1);
    canvas.style.width=`${Math.max(usableWidth*scale,220)}px`;
    canvas.style.height=`${Math.max(totalHeight*scale,120)}px`;
    ctx.setTransform(scale,0,0,scale,0,0);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='rgba(255,255,255,.08)';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle='rgba(255,255,255,.16)';
    ctx.lineWidth=1/scale;
    layout.packed.forEach(item=>{
      ctx.fillStyle=item.box.color;
      ctx.fillRect(item.x,item.y,item.box.width,item.box.height);
      ctx.strokeRect(item.x,item.y,item.box.width,item.box.height);
    });
    return {heightCm:Math.max(totalHeight-parseNumber(separationWidthInput.value,0),0)};
  }
  function renderRepetitions(){
    const cards=[];
    items.forEach((item,index)=>{
      const repeated=Math.max(1,Math.round(parseNumber(item.repeated,1)));
      for(let count=1;count<=repeated;count+=1){
        cards.push(`
          <article class="calc-repetition-card">
            <div class="calc-repetition-box" style="background:${item.color};width:${Math.max(item.width*2,44)}px;height:${Math.max(item.height*2,44)}px"></div>
            <strong>Diseño ${index+1}</strong>
            <span>${formatMetric(item.width)} × ${formatMetric(item.height)} cm</span>
            <small>Repetición ${count} de ${repeated}</small>
          </article>
        `);
      }
    });
    repetitions.innerHTML=cards.join('')||'<p class="hint">Agregá al menos un diseño para visualizar las repeticiones.</p>';
  }
  function recalculate(){
    const materialWidth=parseNumber(materialWidthInput.value,100);
    const padding=parseNumber(paddingInput.value,0);
    const separation=parseNumber(separationWidthInput.value,1);
    const usableWidth=Math.max(materialWidth-(padding*2)+separation,1);
    const expanded=expandItems().filter(item=>item.width>0&&item.height>0);
    const layout=packBoxes(expanded,usableWidth);
    const drawing=drawCanvas(layout,usableWidth);
    result.innerHTML=`<strong>Ancho:</strong> ${formatMetric(materialWidth/100)} m<br><strong>Alto:</strong> ${formatMetric(drawing.heightCm/100)} m<br><span class="hint">Área útil: ${formatMetric(usableWidth)} cm · Diseños cargados: ${expanded.length}</span>`;
    renderRepetitions();
  }

  renderItems();
  recalculate();

  addBtn.addEventListener('click',()=>{
    items.push(createCalcItem());
    renderItems();
    recalculate();
  });
  clearBtn.addEventListener('click',()=>{
    items=[createCalcItem()];
    renderItems();
    recalculate();
  });
  itemsHost.addEventListener('input',event=>{
    const field=event.target.dataset.calcField;
    const index=Number(event.target.dataset.index);
    if(!field||!Number.isInteger(index)||!items[index]) return;
    items[index][field]=field==='repeated'?Math.max(1,Math.round(parseNumber(event.target.value,1))):Math.max(0.01,parseNumber(event.target.value,0.01));
    recalculate();
  });
  itemsHost.addEventListener('click',event=>{
    const button=event.target.closest('[data-calc-remove]');
    if(!button) return;
    const index=Number(button.dataset.calcRemove);
    if(!Number.isInteger(index)) return;
    items.splice(index,1);
    if(!items.length) items=[createCalcItem()];
    renderItems();
    recalculate();
  });
  [materialWidthInput,separationWidthInput,paddingInput].forEach(input=>input.addEventListener('input',recalculate));
}
function activeNav(){ const path=location.pathname.split('/').pop()||'index.html'; document.querySelectorAll('.nav-links a').forEach(a=>{ const href=a.getAttribute('href'); if(href===path) a.classList.add('active'); }); }

function initOrderTabs(){
  const tabs=[...document.querySelectorAll('[data-order-tab]')];
  const panels=[...document.querySelectorAll('.order-panel')];
  if(!tabs.length || !panels.length) return;
  function activate(name){
    tabs.forEach(t=>t.classList.toggle('active',t.dataset.orderTab===name));
    panels.forEach(p=>p.classList.toggle('active',p.id===`panel-${name}`));
  }
  tabs.forEach(t=>t.addEventListener('click',()=>activate(t.dataset.orderTab)));
}
function initDesignTools(){
  const toolBtns=[...document.querySelectorAll('.tool-btn')];
  const toolPanels=[...document.querySelectorAll('.tool-panel')];
  if(toolBtns.length){
    toolBtns.forEach(btn=>btn.addEventListener('click',()=>{
      toolBtns.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      toolPanels.forEach(p=>p.classList.toggle('active',p.id===`tool-${btn.dataset.tool}`));
    }));
  }
  const textInput=document.getElementById('designTextInput');
  const previewText=document.getElementById('designPreviewText');
  const textSize=document.getElementById('designTextSize');
  const designCanvas=document.querySelector('.design-canvas');
  const imageInput=document.getElementById('designImageInput');
  const previewImage=document.getElementById('designPreviewImage');
  const removeBgBtn=document.getElementById('designRemoveBgBtn');
  const resetImageBtn=document.getElementById('designResetImageBtn');
  const imageSmallerBtn=document.getElementById('designImageSmallerBtn');
  const imageBiggerBtn=document.getElementById('designImageBiggerBtn');
  const toggleDesignText=document.getElementById('toggleDesignText');
  const toggleDesignShape=document.getElementById('toggleDesignShape');
  let originalImageSrc='';
  let imageScale=1;
  if(textInput && previewText){
    textInput.addEventListener('input',()=>previewText.textContent=textInput.value || 'DYSTINTA');
  }
  if(textSize && previewText){
    const map={Pequeño:'1rem',Mediano:'1.4rem',Grande:'2rem'};
    textSize.addEventListener('change',()=>previewText.style.fontSize=map[textSize.value]||'1.4rem');
  }
  const chips=[...document.querySelectorAll('.color-chip')];
  chips.forEach(chip=>chip.addEventListener('click',()=>{
    chips.forEach(c=>c.classList.remove('active'));
    chip.classList.add('active');
    if(previewText) previewText.style.color=chip.dataset.color;
    const shape=document.getElementById('designPreviewShape');
    if(shape) shape.style.background=chip.dataset.color;
  }));
  const shapeBtns=[...document.querySelectorAll('.shape-btn')];
  const shape=document.getElementById('designPreviewShape');
  shapeBtns.forEach(btn=>btn.addEventListener('click',()=>{
    shapeBtns.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    if(!shape) return;
    shape.className='canvas-shape';
    if(btn.dataset.shape==='square') shape.classList.add('square');
    if(btn.dataset.shape==='pill') shape.classList.add('pill');
  }));

  function setDragPosition(element,x,y){
    if(!element) return;
    element.dataset.x=String(Math.round(x));
    element.dataset.y=String(Math.round(y));
    element.style.left=`calc(50% + ${Math.round(x)}px)`;
    element.style.top=`calc(50% + ${Math.round(y)}px)`;
  }
  function applyPreviewImageScale(){
    if(!previewImage) return;
    const baseSize=160;
    const nextSize=Math.round(baseSize*imageScale);
    previewImage.style.width=`${nextSize}px`;
  }
  function clampDragPosition(element,x,y){
    if(!designCanvas || !element) return {x,y};
    const canvasRect=designCanvas.getBoundingClientRect();
    const elementRect=element.getBoundingClientRect();
    const halfW=elementRect.width/2;
    const halfH=elementRect.height/2;
    const maxX=(canvasRect.width/2)-halfW;
    const maxY=(canvasRect.height/2)-halfH;
    return {
      x:Math.max(-maxX,Math.min(maxX,x)),
      y:Math.max(-maxY,Math.min(maxY,y))
    };
  }
  function makeDraggable(element,initialX,initialY){
    if(!element || !designCanvas) return;
    setDragPosition(element,initialX,initialY);
    let dragState=null;
    element.addEventListener('pointerdown',event=>{
      if(element.classList.contains('hidden')) return;
      event.preventDefault();
      const startX=Number(element.dataset.x||0);
      const startY=Number(element.dataset.y||0);
      dragState={pointerId:event.pointerId,startClientX:event.clientX,startClientY:event.clientY,startX,startY};
      element.setPointerCapture(event.pointerId);
      element.classList.add('canvas-dragging');
    });
    element.addEventListener('pointermove',event=>{
      if(!dragState || dragState.pointerId!==event.pointerId) return;
      const nextX=dragState.startX+(event.clientX-dragState.startClientX);
      const nextY=dragState.startY+(event.clientY-dragState.startClientY);
      const clamped=clampDragPosition(element,nextX,nextY);
      setDragPosition(element,clamped.x,clamped.y);
    });
    function stopDragging(event){
      if(!dragState || dragState.pointerId!==event.pointerId) return;
      dragState=null;
      element.classList.remove('canvas-dragging');
      if(element.hasPointerCapture?.(event.pointerId)) element.releasePointerCapture(event.pointerId);
    }
    element.addEventListener('pointerup',stopDragging);
    element.addEventListener('pointercancel',stopDragging);
  }

  makeDraggable(previewText,0,-8);
  makeDraggable(shape,0,38);
  makeDraggable(previewImage,0,0);
  applyPreviewImageScale();

  function setPreviewImage(src){
    if(!previewImage) return;
    previewImage.src=src;
    previewImage.classList.toggle('hidden',!src);
    if(src){
      imageScale=1;
      applyPreviewImageScale();
      setDragPosition(previewImage,0,0);
    }
  }
  function removeBackgroundFromImage(src){
    return new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>{
        const canvas=document.createElement('canvas');
        canvas.width=img.naturalWidth;
        canvas.height=img.naturalHeight;
        const ctx=canvas.getContext('2d');
        if(!ctx) return reject(new Error('Canvas no disponible'));
        ctx.drawImage(img,0,0);
        const imageData=ctx.getImageData(0,0,canvas.width,canvas.height);
        const {data}=imageData;
        const points=[
          [0,0],[canvas.width-1,0],[0,canvas.height-1],[canvas.width-1,canvas.height-1],
          [Math.floor(canvas.width/2),0],[Math.floor(canvas.width/2),canvas.height-1]
        ];
        const samples=points.map(([x,y])=>{
          const idx=(y*canvas.width+x)*4;
          return [data[idx],data[idx+1],data[idx+2]];
        });
        const base=samples.reduce((acc,[r,g,b])=>[acc[0]+r,acc[1]+g,acc[2]+b],[0,0,0]).map(v=>v/samples.length);
        const threshold=55;
        for(let i=0;i<data.length;i+=4){
          const dr=data[i]-base[0];
          const dg=data[i+1]-base[1];
          const db=data[i+2]-base[2];
          const distance=Math.sqrt(dr*dr+dg*dg+db*db);
          if(distance<threshold){
            data[i+3]=0;
          }
        }
        ctx.putImageData(imageData,0,0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror=()=>reject(new Error('No se pudo procesar la imagen'));
      img.src=src;
    });
  }

  if(imageInput && previewImage){
    imageInput.addEventListener('change',()=>{
      const file=imageInput.files?.[0];
      if(!file) return;
      const isPng=file.type==='image/png' || file.name.toLowerCase().endsWith('.png');
      if(!isPng){
        imageInput.value='';
        alert('Solo se permiten imágenes PNG para el mockup.');
        return;
      }
      const reader=new FileReader();
      reader.onload=()=>{
        originalImageSrc=String(reader.result||'');
        setPreviewImage(originalImageSrc);
      };
      reader.readAsDataURL(file);
    });
  }
  if(removeBgBtn){
    removeBgBtn.addEventListener('click',async()=>{
      if(!originalImageSrc){
        alert('Primero cargá una imagen PNG.');
        return;
      }
      try{
        const processed=await removeBackgroundFromImage(previewImage.src || originalImageSrc);
        setPreviewImage(processed);
      }catch(err){
        alert('No se pudo quitar el fondo automáticamente.');
      }
    });
  }
  if(resetImageBtn){
    resetImageBtn.addEventListener('click',()=>{
      if(!originalImageSrc){
        setPreviewImage('');
        return;
      }
      setPreviewImage(originalImageSrc);
    });
  }
  if(imageSmallerBtn){
    imageSmallerBtn.addEventListener('click',()=>{
      if(!previewImage || previewImage.classList.contains('hidden')) return;
      imageScale=Math.max(.4,Number((imageScale-.1).toFixed(2)));
      applyPreviewImageScale();
      const clamped=clampDragPosition(previewImage,Number(previewImage.dataset.x||0),Number(previewImage.dataset.y||0));
      setDragPosition(previewImage,clamped.x,clamped.y);
    });
  }
  if(imageBiggerBtn){
    imageBiggerBtn.addEventListener('click',()=>{
      if(!previewImage || previewImage.classList.contains('hidden')) return;
      imageScale=Math.min(3,Number((imageScale+.1).toFixed(2)));
      applyPreviewImageScale();
      const clamped=clampDragPosition(previewImage,Number(previewImage.dataset.x||0),Number(previewImage.dataset.y||0));
      setDragPosition(previewImage,clamped.x,clamped.y);
    });
  }
  if(toggleDesignText && previewText){
    toggleDesignText.addEventListener('change',()=>{
      previewText.classList.toggle('hidden',!toggleDesignText.checked);
    });
  }
  if(toggleDesignShape && shape){
    toggleDesignShape.addEventListener('change',()=>{
      shape.classList.toggle('hidden',!toggleDesignShape.checked);
    });
  }
}


async function renderCarouselMedia(){
  const slides=[...document.querySelectorAll('.video-slide[data-video-key]')];
  if(!slides.length) return;
  for(const slide of slides){
    const key=slide.dataset.videoKey;
    const file=await getMediaFile(key).catch(()=>null);
    const caption=slide.querySelector('.video-caption')?.textContent || '';
    if(file){
      const url=URL.createObjectURL(file);
      slide.innerHTML=`<video class="video-media" autoplay muted loop playsinline preload="metadata"></video><div class="video-caption">${caption}</div>`;
      slide.querySelector('video').src=url;
    }else if(!slide.querySelector('.video-placeholder')){
      slide.innerHTML=`<div class="video-placeholder">Video / presentación de ${caption}<div class="video-caption">${caption}</div></div>`;
    }
  }
}
async function refreshHomeMediaStatus(){
  for(let i=1;i<=3;i++){
    const status=document.getElementById(`videoStatus${i}`);
    if(!status) continue;
    const file=await getMediaFile(`home_video_${i}`).catch(()=>null);
    status.textContent=file?`Cargado: ${file.name}`:'Sin video cargado';
  }
}
function initHomeMediaAdmin(){
  [1,2,3].forEach(i=>{
    const input=document.getElementById(`videoFile${i}`);
    if(input){
      input.addEventListener('change',async()=>{
        const file=input.files?.[0];
        if(!file) return;
        await saveMediaFile(`home_video_${i}`,file);
        const status=document.getElementById(`videoStatus${i}`);
        if(status) status.textContent=`Cargado: ${file.name}`;
        if(window.saveMsg) saveMsg.innerHTML='<div class="notice">Video guardado correctamente</div>';
      });
    }
  });
  document.querySelectorAll('[data-clear-video]').forEach(btn=>btn.addEventListener('click',async()=>{
    await deleteMediaFile(btn.dataset.clearVideo);
    await refreshHomeMediaStatus();
    if(window.saveMsg) saveMsg.innerHTML='<div class="notice">Video eliminado del carrusel</div>';
  }));
  refreshHomeMediaStatus();
}
function initCarousel(){
  const slides=[...document.querySelectorAll('.video-slide')];
  if(!slides.length) return;
  let i=0;
  function syncVideo(slide,isActive){
    const video=slide.querySelector('video');
    if(!video) return;
    if(isActive){
      const playPromise=video.play();
      if(playPromise && typeof playPromise.catch==='function') playPromise.catch(()=>{});
    }else{
      video.pause();
      video.currentTime=0;
    }
  }
  function show(n){
    slides.forEach((slide,idx)=>{
      const active=idx===n;
      slide.classList.toggle('active',active);
      syncVideo(slide,active);
    });
  }
  show(0);
  document.getElementById('nextSlide')?.addEventListener('click',()=>{i=(i+1)%slides.length;show(i)});
  document.getElementById('prevSlide')?.addEventListener('click',()=>{i=(i-1+slides.length)%slides.length;show(i)});
  setInterval(()=>{i=(i+1)%slides.length;show(i)},5000);
}
function exportJSON(){ const blob=new Blob([JSON.stringify({site:getData(),users:getUsers(),orders:getOrders()},null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='dystinta-backup.json'; a.click(); }
function importJSON(file){ const reader=new FileReader(); reader.onload=()=>{ try{ const parsed=JSON.parse(reader.result); if(parsed.site) saveData(parsed.site); if(parsed.users) saveUsers(parsed.users); if(parsed.orders) saveOrders(parsed.orders); alert('Importación exitosa'); location.reload(); }catch(err){ alert('JSON inválido'); } }; reader.readAsText(file); }
document.addEventListener('DOMContentLoaded',async()=>{ applyCommon(); await renderCarouselMedia(); activeNav(); initCarousel(); initOrderTabs(); initOrderForms(); initCalculator(); initDesignTools(); });
