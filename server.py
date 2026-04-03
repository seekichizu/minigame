import http.server, os
os.chdir("/Users/hwanghyeyoung/Downloads/05 AI Projects/01 test projects/minigame")
handler = http.server.SimpleHTTPRequestHandler
httpd = http.server.HTTPServer(("127.0.0.1", 3001), handler)
httpd.serve_forever()
