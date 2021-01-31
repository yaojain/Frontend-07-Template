const http = require('http')
console.log(http)
http.createServer((request,response)=>{
  let body=[]
  request.on('error',err=>{
    console.error(err)
  }).on('data',chunk=>{
    console.log(chunk)
    body.push(chunk.toString())
  }).on('end',()=>{
    // body = Buffer.concat(body).toString()
    console.log('body',body)
    response.writeHead(200,{'Content-Type':'text/html'})
    response.end(`
    <html lang=zh>
      <head>
        <title>Document</title>
        <meta charset=UTF-8/>
        <style>
          body div .span {
            line-height: 100px;
            padding-top: 200px;
          }
          body div span {
            background-color: red;
          }
        </style>
      </head>
      <body>
        <div>
          <span class="span">span</span>
          <img src=fff alt=sdf />
        </div>
      </body>
    </html>
        `)
  })
}).listen(8088,()=>{
  console.log('server started')
})
