## Docker CMD to build and register to github playwright runner

docker system prune -a --volumes

docker build -f DockerfilePlaywright -t app-playwright .
docker run -p 10000:10000 --env PORT=10000 app-playwright
docker exec -it b3e4f5207e99 xvfb-run --auto-servernum --server-args='-screen 0 1280x720x24' python app_playwright.py --debug --port 10000
python3 app_playwright.py --port 10000 --debug
docker buildx build --platform linux/amd64 -f DockerfilePlaywright -t ghcr.io/angelstreet/automai:v1.0.8 .

echo $GITHUB_PAT | docker login ghcr.io -u angelstreet --password-stdin
docker push ghcr.io/angelstreet/automai:v1.0.8
