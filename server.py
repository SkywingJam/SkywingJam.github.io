# runs a simples html server to serve the index.html file and the profile image
import http.server
import socketserver
PORT = 8001
Handler = http.server.SimpleHTTPRequestHandler
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print("Serving at port", PORT)
    httpd.serve_forever()