
const http=require('http');
function get(path){return new Promise((resolve,reject)=>{
 const req=http.get('http://localhost:3000'+path,res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>resolve({status:res.statusCode,body:d}))});
 req.on('error',reject);
})}
(async()=>{const r=await get('/api/health'); if(r.status!==200) throw Error(r.body); console.log('API health OK:',r.body)})().catch(e=>{console.error(e);process.exit(1)});
