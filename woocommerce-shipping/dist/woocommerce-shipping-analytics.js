
!function(){try{var e="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{},n=(new Error).stack;n&&(e._sentryDebugIds=e._sentryDebugIds||{},e._sentryDebugIds[n]="f86838ad-0a0c-5f16-b5b0-634c511d21a6")}catch(e){}}();
(()=>{"use strict";var e,t,r,o,n,i={6342:(e,t,r)=>{const o=window.wp.hooks;var n=r(8468),i=r(7723);const p=(0,n.lazy)((()=>Promise.all([r.e(926),r.e(88)]).then(r.bind(r,5088))));(0,o.addFilter)("woocommerce_admin_reports_list","analytics/shipping",(e=>[...e,{report:"shipping",title:(0,i.__)("Shipping Labels","woocommerce-shipping"),component:p,navArgs:{id:"shipping-analytics"}}]))},1609:e=>{e.exports=window.React},5795:e=>{e.exports=window.ReactDOM},6087:e=>{e.exports=window.lodash},8846:e=>{e.exports=window.wc.components},1554:e=>{e.exports=window.wc.csvExport},4111:e=>{e.exports=window.wc.currency},7374:e=>{e.exports=window.wc.date},5703:e=>{e.exports=window.wc.wcSettings},195:e=>{e.exports=window.wp.a11y},1455:e=>{e.exports=window.wp.apiFetch},9491:e=>{e.exports=window.wp.compose},7143:e=>{e.exports=window.wp.data},6161:e=>{e.exports=window.wp.dataControls},8443:e=>{e.exports=window.wp.date},4040:e=>{e.exports=window.wp.deprecated},8490:e=>{e.exports=window.wp.domReady},8468:e=>{e.exports=window.wp.element},7723:e=>{e.exports=window.wp.i18n},5573:e=>{e.exports=window.wp.primitives},3832:e=>{e.exports=window.wp.url},979:e=>{e.exports=window.wp.warning}},p={};function a(e){var t=p[e];if(void 0!==t)return t.exports;var r=p[e]={exports:{}};return i[e](r,r.exports,a),r.exports}a.m=i,e=[],a.O=(t,r,o,n)=>{if(!r){var i=1/0;for(d=0;d<e.length;d++){for(var[r,o,n]=e[d],p=!0,s=0;s<r.length;s++)(!1&n||i>=n)&&Object.keys(a.O).every((e=>a.O[e](r[s])))?r.splice(s--,1):(p=!1,n<i&&(i=n));if(p){e.splice(d--,1);var c=o();void 0!==c&&(t=c)}}return t}n=n||0;for(var d=e.length;d>0&&e[d-1][2]>n;d--)e[d]=e[d-1];e[d]=[r,o,n]},a.n=e=>{var t=e&&e.__esModule?()=>e.default:()=>e;return a.d(t,{a:t}),t},r=Object.getPrototypeOf?e=>Object.getPrototypeOf(e):e=>e.__proto__,a.t=function(e,o){if(1&o&&(e=this(e)),8&o)return e;if("object"==typeof e&&e){if(4&o&&e.__esModule)return e;if(16&o&&"function"==typeof e.then)return e}var n=Object.create(null);a.r(n);var i={};t=t||[null,r({}),r([]),r(r)];for(var p=2&o&&e;"object"==typeof p&&!~t.indexOf(p);p=r(p))Object.getOwnPropertyNames(p).forEach((t=>i[t]=()=>e[t]));return i.default=()=>e,a.d(n,i),n},a.d=(e,t)=>{for(var r in t)a.o(t,r)&&!a.o(e,r)&&Object.defineProperty(e,r,{enumerable:!0,get:t[r]})},a.f={},a.e=e=>Promise.all(Object.keys(a.f).reduce(((t,r)=>(a.f[r](e,t),t)),[])),a.u=e=>e+".js",a.miniCssF=e=>{},a.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(e){if("object"==typeof window)return window}}(),a.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),o={},n="woocommerce-shipping:",a.l=(e,t,r,i)=>{if(o[e])o[e].push(t);else{var p,s;if(void 0!==r)for(var c=document.getElementsByTagName("script"),d=0;d<c.length;d++){var w=c[d];if(w.getAttribute("src")==e||w.getAttribute("data-webpack")==n+r){p=w;break}}p||(s=!0,(p=document.createElement("script")).charset="utf-8",p.timeout=120,a.nc&&p.setAttribute("nonce",a.nc),p.setAttribute("data-webpack",n+r),p.src=e),o[e]=[t];var l=(t,r)=>{p.onerror=p.onload=null,clearTimeout(u);var n=o[e];if(delete o[e],p.parentNode&&p.parentNode.removeChild(p),n&&n.forEach((e=>e(r))),t)return t(r)},u=setTimeout(l.bind(null,void 0,{type:"timeout",target:p}),12e4);p.onerror=l.bind(null,p.onerror),p.onload=l.bind(null,p.onload),s&&document.head.appendChild(p)}},a.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},(()=>{var e;a.g.importScripts&&(e=a.g.location+"");var t=a.g.document;if(!e&&t&&(t.currentScript&&(e=t.currentScript.src),!e)){var r=t.getElementsByTagName("script");if(r.length)for(var o=r.length-1;o>-1&&(!e||!/^http(s?):/.test(e));)e=r[o--].src}if(!e)throw new Error("Automatic publicPath is not supported in this browser");e=e.replace(/#.*$/,"").replace(/\?.*$/,"").replace(/\/[^\/]+$/,"/"),a.p=e})(),(()=>{var e={291:0,362:0};a.f.j=(t,r)=>{var o=a.o(e,t)?e[t]:void 0;if(0!==o)if(o)r.push(o[2]);else if(362!=t){var n=new Promise(((r,n)=>o=e[t]=[r,n]));r.push(o[2]=n);var i=a.p+a.u(t),p=new Error;a.l(i,(r=>{if(a.o(e,t)&&(0!==(o=e[t])&&(e[t]=void 0),o)){var n=r&&("load"===r.type?"missing":r.type),i=r&&r.target&&r.target.src;p.message="Loading chunk "+t+" failed.\n("+n+": "+i+")",p.name="ChunkLoadError",p.type=n,p.request=i,o[1](p)}}),"chunk-"+t,t)}else e[t]=0},a.O.j=t=>0===e[t];var t=(t,r)=>{var o,n,[i,p,s]=r,c=0;if(i.some((t=>0!==e[t]))){for(o in p)a.o(p,o)&&(a.m[o]=p[o]);if(s)var d=s(a)}for(t&&t(r);c<i.length;c++)n=i[c],a.o(e,n)&&e[n]&&e[n][0](),e[n]=0;return a.O(d)},r=globalThis.webpackChunkwoocommerce_shipping=globalThis.webpackChunkwoocommerce_shipping||[];r.forEach(t.bind(null,0)),r.push=t.bind(null,r.push.bind(r))})();var s=a.O(void 0,[362],(()=>a(6342)));s=a.O(s)})();
//# sourceMappingURL=woocommerce-shipping-analytics.js.map
//# debugId=f86838ad-0a0c-5f16-b5b0-634c511d21a6