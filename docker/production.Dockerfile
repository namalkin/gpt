FROM python:3.12.8-slim AS render
WORKDIR /app
RUN pip install --no-cache-dir Markdown==3.7
COPY server.py .
COPY course ./course
COPY web ./web
RUN python -c "from pathlib import Path; from server import course; target=Path('web/api/course'); target.parent.mkdir(exist_ok=True); target.write_bytes(course())"

FROM nginx:1.27-alpine
COPY deploy/course-nginx.conf /etc/nginx/nginx.conf
COPY --from=render /app/web /usr/share/nginx/html
EXPOSE 8080
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
