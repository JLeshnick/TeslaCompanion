import http.server
import socketserver
import urllib.request
import shutil
import sys
import socket
from urllib.parse import urlparse, parse_qs

PORT = 8000

class ThreadingTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        # Suppress default logging to reduce noise
        pass

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Authorization, Content-Type, Range')
        self.end_headers()

    def do_GET(self):
        # Handle the /proxy endpoint
        if self.path.startswith('/proxy'):
            query = parse_qs(urlparse(self.path).query)
            if 'url' not in query:
                self.send_error(400, "Missing url parameter")
                return
            
            target_url = query['url'][0]
            # print(f"Proxying: {target_url}") # Uncomment for debugging

            try:
                # Create request object
                req = urllib.request.Request(target_url)
                
                # Forward headers
                for header in ['Authorization', 'Range', 'User-Agent']:
                     val = self.headers.get(header)
                     if val:
                         req.add_header(header, val)
                
                if not req.has_header('User-Agent'):
                    req.add_header('User-Agent', 'TeslaCompanion-Proxy/1.0')

                # Open the connection to the target
                with urllib.request.urlopen(req) as response:
                    self.send_response(response.status)
                    
                    # Forward headers
                    for key, value in response.getheaders():
                        if key.lower() not in ['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailers', 'transfer-encoding', 'upgrade']:
                            self.send_header(key, value)
                    
                    # Add CORS headers
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    
                    # Stream the content
                    try:
                        shutil.copyfileobj(response, self.wfile)
                    except (ConnectionAbortedError, BrokenPipeError, ConnectionResetError):
                        # Client closed connection, ignore
                        pass
                    except socket.error:
                        pass
                    
            except urllib.error.HTTPError as e:
                self.send_response(e.code)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                if e.fp:
                    try:
                        shutil.copyfileobj(e.fp, self.wfile)
                    except:
                        pass
            except Exception as e:
                # print(f"Error proxying {target_url}: {e}")
                try:
                    self.send_error(500, str(e))
                except:
                    pass
        else:
            # Serve local files (like index.html) normally
            super().do_GET()

if __name__ == "__main__":
    print(f"Starting Multithreaded CORS Proxy on port {PORT}...")
    print(f"1. Keep this window open.")
    print(f"2. In TeslaCompanion, check the 'Use Proxy' box.")
    print(f"   (Or open http://localhost:{PORT}/index.html directly)")
    
    socketserver.TCPServer.allow_reuse_address = True
    
    # Use ThreadingTCPServer for concurrent requests
    with ThreadingTCPServer(("", PORT), ProxyHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopping proxy.")
            httpd.shutdown()
