FROM node:lts-bookworm-slim
ARG BRUNO_CLI_VERSION
RUN npm install -g @usebruno/cli@$BRUNO_CLI_VERSION
WORKDIR /tests
ENTRYPOINT ["bru"]
CMD ["run", "--env", "test"]
