"use strict";
!function(){try{var e="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{},n=(new Error).stack;n&&(e._sentryDebugIds=e._sentryDebugIds||{},e._sentryDebugIds[n]="33792064-f5b2-525e-a398-ad71aa79632b")}catch(e){}}();
(globalThis.webpackChunkwoocommerce_shipping=globalThis.webpackChunkwoocommerce_shipping||[]).push([[88],{5088:(e,t,r)=>{r.r(t),r.d(t,{default:()=>z});var a={};r.r(a),r.d(a,{getLabelsReport:()=>k,getState:()=>_});var o={};r.r(o),r.d(o,{fetchLabelsSuccess:()=>S});var i={};r.r(i),r.d(i,{getLabelsReport:()=>C});var n=r(1609),s=r(4111),c=r.n(s),l=r(7143),p=r(6161),d=r(6087);const m=e=>(0,d.mapKeys)(e,((e,t)=>(0,d.camelCase)(t)));r(5703);var u=r(7723);(0,d.memoize)((e=>(0,d.groupBy)(e,"serviceId")));const g=e=>{try{return new ActiveXObject(e)}catch(e){}};(0,d.memoize)((()=>(0,d.get)(window,"navigator.msSaveOrOpenBlob")?"ie":/iPad|iPhone|iPod/.test(navigator.userAgent)&&!window.MSStream?"addon":(0,d.includes)(navigator.userAgent,"Firefox")?parseFloat(navigator.userAgent.split("Firefox/")[1])>=94?"native_ff":"addon":(0,d.includes)(navigator.userAgent,"Safari")&&!(0,d.includes)(navigator.userAgent,"Chrome")?"addon":navigator.mimeTypes?.["application/pdf"]||navigator.pdfViewerEnabled?"native":!(!g("AcroPDF.PDF")&&!g("PDF.PdfCtrl"))&&"addon"));var h=r(3832);r(8490);var w=r(7374);const f=["created_date","order_id","rate","service_name","refund","tracking","carrier_id"],y=e=>{return(0,h.addQueryArgs)("/wcshipping/v1/reports/labels",(t=(e=>{const{period:t,compare:r,before:a,after:o}=(0,w.getDateParamsFromQuery)(e),{primary:i,secondary:n}=(0,w.getCurrentDates)(e);return{period:t,compare:r,before:a,after:o,primary:i,secondary:n}})(e),r={perPage:e.perPage,offset:e.offset},{after:encodeURIComponent((0,w.appendTimestamp)(t.primary.after,"start")),before:encodeURIComponent((0,w.appendTimestamp)(t.primary.before,"end")),per_page:r.perPage,offset:r.offset,fields:f}));var t,r},v="ANALYTICS/FETCH_LABELS_SUCCESS",b=(e=>{const t={},r=()=>(r=e,a)=>{const o=t[a.type];return"function"==typeof o?o(r,a):r},a=(e,o)=>(t[e]=o,{on:a,bind:r});return{on:a,bind:r}})({data:void 0}).on(v,((e,{payload:{query:t,result:r}})=>{var a;return{...e,data:{...null!==(a=e.data)&&void 0!==a?a:{},[JSON.stringify(t)]:{rows:r.rows,meta:r.meta}}}})).bind(),_=e=>e,k=(e,t)=>e.data?.[JSON.stringify(t)],S=e=>({type:v,payload:e});function*C(e){const{rows:t,meta:r}=yield(0,p.apiFetch)({path:y(e),method:"GET"});return S({query:e,result:{rows:t.map(m),meta:m(r)}})}let E;var P=r(8846),x=r(1896),A=r(8023),F=r(6096),L=r(8468),D=r(1455),T=r.n(D),I=r(1554);const N=()=>(0,n.createElement)("svg",{role:"img","aria-hidden":"true",focusable:"false",version:"1.1",xmlns:"http://www.w3.org/2000/svg",x:"0px",y:"0px",viewBox:"0 0 24 24",style:{width:"24px",height:"24px",marginRight:"8px"}},(0,n.createElement)("path",{d:"M18,9c-0.009,0-0.017,0.002-0.025,0.003C17.72,5.646,14.922,3,11.5,3C7.91,3,5,5.91,5,9.5c0,0.524,0.069,1.031,0.186,1.519 C5.123,11.016,5.064,11,5,11c-2.209,0-4,1.791-4,4c0,1.202,0.541,2.267,1.38,3h18.593C22.196,17.089,23,15.643,23,14 C23,11.239,20.761,9,18,9z M12,16l-4-5h3V8h2v3h3L12,16z"}));var R=r(8443);const q={usps:e=>`https://tools.usps.com/go/TrackConfirmAction.action?tLabels=${e}`,fedex:e=>`https://www.fedex.com/apps/fedextrack/?action=track&tracknumbers=${e}`,ups:e=>`https://www.ups.com/track?loc=en_US&tracknum=${e}`,upsdap:e=>`https://www.ups.com/track?loc=en_US&tracknum=${e}`,dhlexpress:e=>`https://www.dhl.com/en/express/tracking.html?AWB=${e}&brand=DHL`},B=e=>t=>{var r,a;const o=t.createdDate?(0,R.dateI18n)("M d, Y g:i a",new Date(t.createdDate),!1):null;return[{display:o,value:o},{display:(0,n.createElement)(P.Link,{href:`post.php?post=${t.orderId}&action=edit`,type:"wp-admin",target:"_blank"},`#${t.orderId}`),value:t.orderId},{display:e?.render(null!==(r=t.rate)&&void 0!==r?r:0),value:null!==(a=t.rate)&&void 0!==a?a:0},{display:t.serviceName,value:t.serviceName},{display:t.carrierId&&t.tracking&&q[t.carrierId]?(0,n.createElement)(P.Link,{href:q[t.carrierId](t.tracking),target:"_blank",type:"external"},t.tracking):t.tracking,value:t.tracking},{display:t.refund?.status,value:t.refund?.status}]},V=[{key:"createdDate",label:(0,u.__)("Date","woocommerce-shipping"),isLeftAligned:!0,isSortable:!1,required:!0},{key:"orderId",label:(0,u.__)("Order","woocommerce-shipping"),isSortable:!1,isNumeric:!1,required:!0},{key:"rate",label:(0,u.__)("Price","woocommerce-shipping"),isSortable:!1,isNumeric:!0,required:!0},{key:"serviceName",label:(0,u.__)("Service","woocommerce-shipping"),isSortable:!1,isNumeric:!1,required:!0},{key:"tracking",label:(0,u.__)("Tracking Number","woocommerce-shipping"),isSortable:!1,isLeftAligned:!0,isNumeric:!0,required:!1},{key:"refund",label:(0,u.__)("Refund status","woocommerce-shipping"),isSortable:!1,isNumeric:!1}],$=({query:e,path:t,currency:r})=>{var a;const[o,i]=(0,L.useState)({perPage:25,paged:1}),[s,c]=(0,L.useState)(!1),[p,g]=(0,L.useState)([]),h={rows:[],summary:[]},f=(0,l.useSelect)((t=>(g([]),t(E).getLabelsReport({...e,perPage:o.perPage.toString(),offset:""+(o.paged-1)*o.perPage}))),[e,t,o]);f?.rows&&f.meta&&(h.rows=f.rows.map(B(r)),h.summary=[{key:"total_count",label:(0,u.__)("Labels purchased in this period","woocommerce-shipping"),value:f.meta.totalCount},{key:"total_cost",label:(0,u.__)("Total label cost in this period","woocommerce-shipping"),value:r?.render(f.meta.totalCost)},{key:"total_refunds",label:(0,u.__)("Refund in this period","woocommerce-shipping"),value:f.meta.totalRefunds}]);const v=void 0===f;return(0,n.createElement)(n.Fragment,null,(0,n.createElement)(P.ReportFilters,{query:e,path:t,isoDateFormat:w.isoDateFormat}),(0,n.createElement)(x.A,{status:"info",isDismissible:!1},(0,u.sprintf)(
// translators: %d is the cache expiration in minutes
// translators: %d is the cache expiration in minutes
(0,u.__)("To improve performance, the data shown here may be up to %d minutes old.","woocommerce-shipping"),window.WCShipping_Config.cacheExpirationInSeconds/60)),(0,n.createElement)(A.A,{marginBottom:3}),p.length>0&&(0,n.createElement)(n.Fragment,null,(0,n.createElement)(x.A,{status:"error"},p.map(((e,t)=>(0,n.createElement)("p",{key:t},e)))),(0,n.createElement)(A.A,{marginBottom:3})),(0,n.createElement)(P.TableCard,{title:(0,u.__)("Labels in this period","woocommerce-shipping"),rows:h.rows,headers:V,rowsPerPage:o.perPage,totalRows:null!==(a=f?.meta.totalCount)&&void 0!==a?a:0,summary:h.summary,isLoading:v,query:o,actions:[(0,n.createElement)(F.Ay,{key:"download",disabled:v||0===h.rows.length||s,onClick:async()=>{let{rows:t}=h;if(g([]),f?.meta.totalCount&&f.meta.totalCount>o.perPage){c(!0);try{t=(await T()({path:y({...e,perPage:"-1",offset:"0"}),method:"GET"})).rows.map(m).map(B(r))}catch(e){return void g([...p,(0,u.__)("Failed to fetch data for export.","woocommerce-shipping")])}finally{c(!1)}}try{const r={...e};(0,I.downloadCSVFile)((0,I.generateCSVFileName)((0,u.__)("Shipping Labels","woocommerce-shipping"),r),(0,I.generateCSVDataFromTable)(V,t))}catch(e){g([...p,(0,u.__)("Failed to request download of CSV file.","woocommerce-shipping")])}},title:(0,u.__)("Export CSV","woocommerce-shipping"),isBusy:s},(0,n.createElement)(N,null),(0,u.__)("Download","woocommerce-shipping"))],onQueryChange:e=>t=>{"page_size"!==e&&"paged"!==e||i({...o,[(0,d.camelCase)(e)]:parseInt(t,10)})}}))},O=c()();E=E||(0,l.createReduxStore)("wcshipping/analytics",{reducer:b,actions:o,selectors:a,controls:p.controls,resolvers:i}),(0,l.register)(E);const z=e=>(0,n.createElement)("div",{className:"wcshipping-label-analytics"},(0,n.createElement)($,{...e,currency:O}))}}]);
//# sourceMappingURL=88.js.map
//# debugId=33792064-f5b2-525e-a398-ad71aa79632b
