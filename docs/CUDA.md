# CUDA inspection and pending target-host validation

**CUDA was not tested.** Host: arm64 macOS / Apple M3 Max. PyTorch here is a macOS wheel. `validation/results/environment.json` records actual CPU device evidence. MPS is not a substitute for NVIDIA CUDA.

Pinned upstream has real device-aware execution: `openpronounce/device.py` selects CUDA when available, honors `OPENPRONOUNCE_DEVICE`, and the speech/phone loaders move models to that device. Both CTC inference and acoustic embedding extraction move input tensors too, then return CPU NumPy arrays. DTW, espeak phonemization, reference synthesis and pYIN still run on CPU. Therefore GPU acceleration cannot remove all latency.

**The upstream GPU image is unsuitable as-is for the requested RTX 5060 Ti.** It uses `nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04` and PyTorch cu124 wheels. NVIDIA lists the 5060 Ti at compute capability **12.0 / sm_120**: https://developer.nvidia.com/cuda/gpus . PyTorch introduced Blackwell wheels with **2.7 / CUDA 12.8**: https://pytorch.org/blog/pytorch-2-7/ . Use a target-compatible CUDA 12.8+ runtime and PyTorch build with actual sm_120 kernels (check `torch.cuda.get_arch_list()` and execute kernels). A visible GPU alone proves nothing. Do not reuse the macOS torch wheel/lock as a Linux GPU lock.

The target host needs an NVIDIA Linux driver compatible with the selected CUDA runtime, NVIDIA Container Toolkit for containers, GPU access (`--gpus all`), sufficient disk for three large checkpoints and shared model caches, and measured free VRAM. Exact driver minimum depends on the chosen runtime/container; record it using `nvidia-smi`. Do not assume the installed driver works from a CUDA version string alone. German requires **three** resident checkpoints: English embeddings, German word ASR, and multilingual phone CTC, roughly 3.6 GB raw float32 weights plus activations/overhead. 8 GB and 16 GB 5060 Ti variants require separate peak-memory and concurrency checks; neither capacity has been validated here.

Run on the supplied target host after installing its pinned GPU environment:

```sh
nvidia-smi
OPENPRONOUNCE_DEVICE=cuda HF_HOME="$PWD/.cache/huggingface" .venv/bin/python validation/gpu_probe.py
OPENPRONOUNCE_DEVICE=cuda .venv/bin/python validation/run.py > validation/results/gpu-run.log 2>&1
```

Preserve CPU results first or use a separate checkout: `run.py` writes into `validation/results`. `gpu_probe.py` asserts availability/device placement and runs matrix multiplication plus actual forward passes in all three models; inspect capability, compiled architectures, peak memory and driver. Then rerun every ingestion/control/phrase check on GPU, measure warm p50/p95 with synchronization, peak VRAM, repeated/concurrent requests, and CPU/GPU feedback agreement. The provided probe is an unexecuted follow-up, not CUDA evidence.

The user waived CUDA validation as a prerequisite for CPU implementation and selected one Compose service with private internal FastAPI. Dockerfile and CPU/GPU Compose configurations are supplied, but neither container nor CUDA execution has been performed. No remote GPU host has been supplied.
