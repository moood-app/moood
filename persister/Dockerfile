FROM golang:1.22.0-alpine3.19 as base
# Install system dependencies
RUN apk update && apk add --no-cache \
    ca-certificates \
    build-base \
    libraw-dev

FROM base as dev
# Install air to enable hot reload
RUN go install github.com/cosmtrek/air@latest
# Instal delve debugger
RUN go install github.com/go-delve/delve/cmd/dlv@latest
# Install curl so we can download other dependencies
RUN apk add curl
# Install aws lambda run time interface
ARG AWS_LAMBDA_RIE_VERSION
RUN curl -Lo /aws-lambda-rie https://github.com/aws/aws-lambda-runtime-interface-emulator/releases/download/v$AWS_LAMBDA_RIE_VERSION/aws-lambda-rie && \
    chmod +x /aws-lambda-rie
# Install golanci-lint
RUN curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s v1.56.2
ENTRYPOINT ["air"]

FROM base as builder
# Copy main.go file, dependencies list and custom packages
COPY main.go go.mod go.sum ./
COPY golibraw ./golibraw
COPY imageconverter ./imageconverter
COPY notifier ./notifier
COPY uploader ./uploader
# Download go dependencies and compile main.go into binary
RUN go mod download && go build -ldflags='-s -w' -trimpath -o /dist/main main.go
# Install dynamic dependencies required by the binary and create tmp directory in /dist
RUN ldd /dist/main | tr -s [:blank:] '\n' | grep ^/ | xargs -I % install -D % /dist/% && mkdir /dist/tmp

# Copy artifacts from builder to a clean image
FROM scratch as production
COPY --from=builder /dist /
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
ENTRYPOINT [ "/main" ]