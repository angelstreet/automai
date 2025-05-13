## Docker CMD to build and register to github playwright runner

docker system prune -a --volumes

docker build -t app-browseruse .
docker run -p 10000:10000 -p 6080:6080 --env PORT=10000 app-browseruse
docker exec -it b3e4f5207e99 xvfb-run --auto-servernum --server-args='-screen 0 1280x720x24' python app_playwright.py --debug --port 10000
python3 app_playwright.py --port 10000 --debug


docker buildx build --platform linux/amd64 -t ghcr.io/angelstreet/browser-use:v1.0.2 .

echo $GITHUB_PAT | docker login ghcr.io -u angelstreet --password-stdin
docker push ghcr.io/angelstreet/browser-use:v1.0.11

