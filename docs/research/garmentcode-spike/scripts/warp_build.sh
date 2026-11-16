#!/bin/bash
set -x
cd /tmp
curl -sL https://codeload.github.com/maria-korosteleva/NvidiaWarp-GarmentCode/tar.gz/refs/heads/main -o nwgc.tgz
mkdir -p nwgc && tar xzf nwgc.tgz -C nwgc --strip-components=1
/tmp/gcv/bin/pip download warp-lang==1.0.0 --no-deps --only-binary=:all: -d /tmp/wl --platform manylinux2014_x86_64 2>&1 | tail -2
cd /tmp/wl && python3 -m zipfile -e warp_lang-*.whl x >/dev/null && ls x/warp/bin
cd /tmp/nwgc
time nice -n 10 /tmp/gcv/bin/python build_lib.py --no_standalone --quick 2>&1 | tail -15
mkdir -p warp/bin && cp /tmp/wl/x/warp/bin/warp-clang.so warp/bin/ && ls -la warp/bin
/tmp/gcv/bin/pip install -e . 2>&1 | tail -2
/tmp/gcv/bin/python -c "import warp as wp; wp.init(); print('WARP OK', wp.__version__)"
echo WARP_DONE
