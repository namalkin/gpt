FROM python:3.12.8-slim
WORKDIR /app
RUN pip install --no-cache-dir torch==2.5.1 --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir numpy==1.26.4
COPY labs ./labs
COPY data ./data
CMD ["python", "-m", "labs.experiments", "--help"]
