const http=require('http');
const GKEY=process.env.GEMINI_API_KEY;
const ORIGIN=process.env.ALLOW_ORIGIN||'*';
const MAX_PER_HOUR=+process.env.MAX_PER_HOUR||60,hits=new Map();
http.createServer((req,res)=>{
  const H={'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Headers':'Content-Type','Content-Type':'application/json'};
  if(req.method==='OPTIONS'){res.writeHead(204,H);return res.end()}
  if(req.method!=='POST'){res.writeHead(200,H);return res.end('{"ok":true}')}
  const ip=req.headers['x-forwarded-for']||req.socket.remoteAddress,n=Date.now(),a=(hits.get(ip)||[]).filter(t=>n-t<3600e3);a.push(n);hits.set(ip,a);
  if(a.length>MAX_PER_HOUR){res.writeHead(429,H);return res.end('{"error":"rate"}')}
  let d='';req.on('data',c=>{d+=c;if(d.length>30000)req.destroy()});
  req.on('end',async()=>{try{
    const {prompt}=JSON.parse(d);if(typeof prompt!=='string'||!prompt)throw 0;
    const gm=process.env.MODEL||'gemini-flash-latest';
    const g=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+gm+':generateContent',{method:'POST',headers:{'x-goog-api-key':GKEY,'content-type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:500}})});
    const gj=await g.json();if(!g.ok)throw 0;
    res.writeHead(200,H);res.end(JSON.stringify({text:((gj.candidates&&gj.candidates[0]&&gj.candidates[0].content.parts)||[]).map(c=>c.text||'').join('')}));
  }catch(e){res.writeHead(500,H);res.end('{"error":"server"}')}});
}).listen(+process.env.PORT||8788);
