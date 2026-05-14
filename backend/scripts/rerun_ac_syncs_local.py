import importlib.util
import logging
import os
import sys
import time
import traceback

LOG_FORMAT = '%(asctime)s [%(levelname)s] %(message)s'
logging.basicConfig(level=logging.INFO, format=LOG_FORMAT, force=True)
log = logging.getLogger('rerun-ac')

SYNCS = [
    ('lists',    r'C:\Users\AndrewDaly\Desktop\P2025\sync-ac-lists-premium\function_app.py'),
    ('tags',     r'C:\Users\AndrewDaly\Desktop\P2025\sync-ac-tags-premium\function_app.py'),
    ('segments', r'C:\Users\AndrewDaly\Desktop\P2025\sync-ac-segments-premium\function_app.py'),
]


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(f'sync_ac_{name}_local', path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def run_one(name, path):
    log.info('=' * 70)
    log.info(f'STARTING {name.upper()} sync — module: {path}')
    log.info('=' * 70)
    started = time.time()
    try:
        module = load_module(name, path)
        module.run_sync()
        log.info(f'{name.upper()} sync OK in {(time.time()-started):.0f}s')
        return True
    except Exception as e:
        log.error(f'{name.upper()} sync FAILED after {(time.time()-started):.0f}s: {e}')
        log.error(traceback.format_exc())
        return False


def main():
    only = set(a.lower() for a in sys.argv[1:] if a and not a.startswith('-'))
    overall_start = time.time()
    results = {}
    for name, path in SYNCS:
        if only and name not in only:
            log.info(f'skipping {name} (not in args)')
            continue
        results[name] = run_one(name, path)
    log.info('=' * 70)
    log.info(f'ALL DONE in {(time.time()-overall_start):.0f}s')
    for k, v in results.items():
        log.info(f'  {k}: {"OK" if v else "FAILED"}')


if __name__ == '__main__':
    main()