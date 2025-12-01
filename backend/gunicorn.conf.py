import os

workers = 2
timeout = 300
bind = f"0.0.0.0:{os.getenv('PORT', '10000')}"
worker_class = "sync"
max_requests = 1000
max_requests_jitter = 50
loglevel = "info"
accesslog = "-"
errorlog = "-"
