FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    STORAGE_DIR=/storage

# ffmpeg: codecs que o OpenCV não abre sozinho (formatos de DVR). libgl1/libglib2.0-0: o ultralytics
# instala o opencv-python (não headless) como dependência, que precisa dessas libs.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv
COPY requirements.txt .
# torch só CPU (o wheel padrão traz CUDA, ~2 GB a mais); o MVP roda em CPU.
RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu \
    && pip install -r requirements.txt

COPY app ./app

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
