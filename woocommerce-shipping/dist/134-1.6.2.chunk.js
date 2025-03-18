"use strict";
!function(){try{var e="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof globalThis?globalThis:"undefined"!=typeof self?self:{},n=(new e.Error).stack;n&&(e._sentryDebugIds=e._sentryDebugIds||{},e._sentryDebugIds[n]="a2e4459a-f77c-57e0-b6db-087c19ae9d2d")}catch(e){}}();
(globalThis.webpackChunkwoocommerce_shipping=globalThis.webpackChunkwoocommerce_shipping||[]).push([[134],{4134:(e,r,a)=>{a.r(r),a.d(r,{default:()=>O});var t={};a.r(t),a.d(t,{getLabelsReport:()=>x,getState:()=>_});var o={};a.r(o),a.d(o,{fetchLabelsSuccess:()=>S});var i={};a.r(i),a.d(i,{getLabelsReport:()=>k});var s=a(4111),n=a.n(s),c=a(7143),p=a(6161),d=a(6087);const l=e=>(0,d.mapKeys)(e,((e,r)=>(0,d.camelCase)(r)));a(5703);var m=a(8443),u=a(7723);(0,d.memoize)((e=>(0,d.groupBy)(e,"serviceId")));const g=e=>{try{return new ActiveXObject(e)}catch{}};(0,d.memoize)((()=>(0,d.get)(window,"navigator.msSaveOrOpenBlob")?"ie":/iPad|iPhone|iPod/.test(navigator.userAgent)&&!window.MSStream?"addon":(0,d.includes)(navigator.userAgent,"Firefox")?parseFloat(navigator.userAgent.split("Firefox/")[1])>=94?"native_ff":"addon":(0,d.includes)(navigator.userAgent,"Safari")&&!(0,d.includes)(navigator.userAgent,"Chrome")?"addon":navigator.mimeTypes?.["application/pdf"]||navigator.pdfViewerEnabled?"native":!(!g("AcroPDF.PDF")&&!g("PDF.PdfCtrl"))&&"addon"));var h=a(3832);a(8490);var w=a(7374);const f=["created_date","order_id","rate","service_name","refund","tracking","carrier_id"],y=e=>{return(0,h.addQueryArgs)("/wcshipping/v1/reports/labels",(r=(e=>{const{period:r,compare:a,before:t,after:o}=(0,w.getDateParamsFromQuery)(e),{primary:i,secondary:s}=(0,w.getCurrentDates)(e);return{period:r,compare:a,before:t,after:o,primary:i,secondary:s}})(e),a={perPage:e.perPage,offset:e.offset},{after:encodeURIComponent((0,w.appendTimestamp)(r.primary.after,"start")),before:encodeURIComponent((0,w.appendTimestamp)(r.primary.before,"end")),per_page:a.perPage,offset:a.offset,fields:f}));var r,a},v="ANALYTICS/FETCH_LABELS_SUCCESS",b=(e=>{const r={},a=()=>(a=e,t)=>{const o=r[t.type];return"function"==typeof o?o(a,t):a},t=(e,o)=>(r[e]=o,{on:t,bind:a});return{on:t,bind:a}})({data:void 0}).on(v,((e,{payload:{query:r,result:a}})=>{var t;return{...e,data:{...null!==(t=e.data)&&void 0!==t?t:{},[JSON.stringify(r)]:{rows:a.rows,meta:a.meta}}}})).bind(),_=e=>e,x=(e,r)=>e.data?.[JSON.stringify(r)],S=e=>({type:v,payload:e});function*k(e){const{rows:r,meta:a}=yield(0,p.apiFetch)({path:y(e),method:"GET"});return S({query:e,result:{rows:r.map(l),meta:l(a)}})}let C;var P=a(8846),A=a(5359),F=a(6932),j=a(6295),L=a(8468),D=a(1455),T=a.n(D),I=a(1554),N=a(6070);const R=()=>(0,N.jsx)("svg",{role:"img","aria-hidden":"true",focusable:"false",version:"1.1",xmlns:"http://www.w3.org/2000/svg",x:"0px",y:"0px",viewBox:"0 0 24 24",style:{width:"24px",height:"24px",marginRight:"8px"},children:(0,N.jsx)("path",{d:"M18,9c-0.009,0-0.017,0.002-0.025,0.003C17.72,5.646,14.922,3,11.5,3C7.91,3,5,5.91,5,9.5c0,0.524,0.069,1.031,0.186,1.519 C5.123,11.016,5.064,11,5,11c-2.209,0-4,1.791-4,4c0,1.202,0.541,2.267,1.38,3h18.593C22.196,17.089,23,15.643,23,14 C23,11.239,20.761,9,18,9z M12,16l-4-5h3V8h2v3h3L12,16z"})}),q={usps:e=>`https://tools.usps.com/go/TrackConfirmAction.action?tLabels=${e}`,fedex:e=>`https://www.fedex.com/apps/fedextrack/?action=track&tracknumbers=${e}`,ups:e=>`https://www.ups.com/track?loc=en_US&tracknum=${e}`,upsdap:e=>`https://www.ups.com/track?loc=en_US&tracknum=${e}`,dhlexpress:e=>`https://www.dhl.com/en/express/tracking.html?AWB=${e}&brand=DHL`},B=e=>r=>{var a,t;const o=r.createdDate?(0,m.dateI18n)("M d, Y g:i a",new Date(r.createdDate),!1):null;return[{display:o,value:o},{display:(0,N.jsx)(P.Link,{href:`post.php?post=${r.orderId}&action=edit`,type:"wp-admin",target:"_blank",children:`#${r.orderId}`}),value:r.orderId},{display:e?.render(null!==(a=r.rate)&&void 0!==a?a:0),value:null!==(t=r.rate)&&void 0!==t?t:0},{display:r.serviceName,value:r.serviceName},{display:r.carrierId&&r.tracking&&q[r.carrierId]?(0,N.jsx)(P.Link,{href:q[r.carrierId](r.tracking),target:"_blank",type:"external",children:r.tracking}):r.tracking,value:r.tracking},{display:r.refund?.status,value:r.refund?.status}]},E=[{key:"createdDate",label:(0,u.__)("Date","woocommerce-shipping"),isLeftAligned:!0,isSortable:!1,required:!0},{key:"orderId",label:(0,u.__)("Order","woocommerce-shipping"),isSortable:!1,isNumeric:!1,required:!0},{key:"rate",label:(0,u.__)("Price","woocommerce-shipping"),isSortable:!1,isNumeric:!0,required:!0},{key:"serviceName",label:(0,u.__)("Service","woocommerce-shipping"),isSortable:!1,isNumeric:!1,required:!0},{key:"tracking",label:(0,u.__)("Tracking Number","woocommerce-shipping"),isSortable:!1,isLeftAligned:!0,isNumeric:!0,required:!1},{key:"refund",label:(0,u.__)("Refund status","woocommerce-shipping"),isSortable:!1,isNumeric:!1}],V=({query:e,path:r,currency:a})=>{var t;const[o,i]=(0,L.useState)({perPage:25,paged:1}),[s,n]=(0,L.useState)(!1),[p,m]=(0,L.useState)([]),g={rows:[],summary:[]},h=(0,c.useSelect)((r=>(m([]),r(C).getLabelsReport({...e,perPage:o.perPage.toString(),offset:""+(o.paged-1)*o.perPage}))),[e,r,o]);h?.rows&&h.meta&&(g.rows=h.rows.map(B(a)),g.summary=[{key:"total_count",label:(0,u.__)("Labels purchased in this period","woocommerce-shipping"),value:h.meta.totalCount},{key:"total_cost",label:(0,u.__)("Total label cost in this period","woocommerce-shipping"),value:a?.render(h.meta.totalCost)},{key:"total_refunds",label:(0,u.__)("Refund in this period","woocommerce-shipping"),value:h.meta.totalRefunds}]);const f=void 0===h;return(0,N.jsxs)(N.Fragment,{children:[(0,N.jsx)(P.ReportFilters,{query:e,path:r,isoDateFormat:w.isoDateFormat}),(0,N.jsx)(A.A,{status:"info",isDismissible:!1,children:(0,u.sprintf)(
// translators: %d is the cache expiration in minutes
// translators: %d is the cache expiration in minutes
(0,u.__)("To improve performance, the data shown here may be up to %d minutes old.","woocommerce-shipping"),window.WCShipping_Config.cacheExpirationInSeconds/60)}),(0,N.jsx)(F.A,{marginBottom:3}),p.length>0&&(0,N.jsxs)(N.Fragment,{children:[(0,N.jsx)(A.A,{status:"error",children:p.map(((e,r)=>(0,N.jsx)("p",{children:e},r)))}),(0,N.jsx)(F.A,{marginBottom:3})]}),(0,N.jsx)(P.TableCard,{title:(0,u.__)("Labels in this period","woocommerce-shipping"),rows:g.rows,headers:E,rowsPerPage:o.perPage,totalRows:null!==(t=h?.meta.totalCount)&&void 0!==t?t:0,summary:g.summary,isLoading:f,query:o,actions:[(0,N.jsxs)(j.Ay,{disabled:f||0===g.rows.length||s,onClick:async()=>{let{rows:r}=g;if(m([]),h?.meta.totalCount&&h.meta.totalCount>o.perPage){n(!0);try{r=(await T()({path:y({...e,perPage:"-1",offset:"0"}),method:"GET"})).rows.map(l).map(B(a))}catch{return void m([...p,(0,u.__)("Failed to fetch data for export.","woocommerce-shipping")])}finally{n(!1)}}try{const a={...e};(0,I.downloadCSVFile)((0,I.generateCSVFileName)((0,u.__)("Shipping Labels","woocommerce-shipping"),a),(0,I.generateCSVDataFromTable)(E,r))}catch{m([...p,(0,u.__)("Failed to request download of CSV file.","woocommerce-shipping")])}},title:(0,u.__)("Export CSV","woocommerce-shipping"),isBusy:s,children:[(0,N.jsx)(R,{}),(0,u.__)("Download","woocommerce-shipping")]},"download")],onQueryChange:e=>r=>{"page_size"!==e&&"paged"!==e||i({...o,[(0,d.camelCase)(e)]:parseInt(r,10)})}})]})},$=n()();C=C||(0,c.createReduxStore)("wcshipping/analytics",{reducer:b,actions:o,selectors:t,controls:p.controls,resolvers:i}),(0,c.register)(C);const O=e=>(0,N.jsx)("div",{className:"wcshipping-label-analytics",children:(0,N.jsx)(V,{...e,currency:$})})}}]);
//# sourceMappingURL=134-1.6.2.chunk.js.map
//# debugId=a2e4459a-f77c-57e0-b6db-087c19ae9d2d
