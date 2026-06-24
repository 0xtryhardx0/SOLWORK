import http.server
import socketserver
import os

PORT = 8081

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Allow port reuse to avoid address already in use errors
socketserver.TCPServer.allow_reuse_address = True

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving SolWork Prototype at http://localhost:{PORT}")
    httpd.serve_forever()
