# Ollama RUNTIME
Run ollama with docker compose


## Installation

### Runnig Ollama from compose
```Console
$ ./runtime/scripts/ollama.sh start
```

### Pulling needed models 

#### Enter in docker container
```
$ ./runtime/scripts/ollama.sh shell
```
#### Run in container
```
ollama pull mistral
ollama pull llama3.2:3b
exit
```

### If you want use Nvidia GPU with Ubuntu in 2 steps

1. Uncomment in docker compose :

```
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
```

2. Install `nvidia-container-toolkit` in host (not in container)

```
 curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg  && curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
 sudo apt-get update
 sudo apt-get install -y nvidia-container-toolkit
 sudo nvidia-ctk runtime configure --runtime=docker
 sudo systemctl restart docker
```

## Usage
API : http://localhost:11434

## Inspired by 
https://github.com/ThierryTouin/my-ollama/blob/main/README.md
