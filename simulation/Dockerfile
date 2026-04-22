FROM eclipse/sumo:1.21.0
USER root
RUN apt-get update && apt-get install -y python3-pip
WORKDIR /app
COPY requirements.txt .
# Add --break-system-packages if needed, or create venv
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt
COPY . .
CMD ["python3", "runner.py"]
