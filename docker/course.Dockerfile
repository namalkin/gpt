FROM python:3.12.8-slim
WORKDIR /app
RUN pip install --no-cache-dir Markdown==3.7
COPY server.py .
COPY course ./course
COPY web ./web
EXPOSE 8080
CMD ["python", "server.py"]
