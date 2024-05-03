FROM public.ecr.aws/lambda/python:3.9 as base
RUN yum update -y && \
    yum install -y gcc-c++ libffi-devel openssl-devel && \
    yum clean all
COPY requirements.txt ${LAMBDA_TASK_ROOT}
RUN pip install --no-cache-dir -r requirements.txt

FROM base as development
CMD [ "worker.handler" ]

FROM base as production
RUN yum update -y && \
    yum install -y gcc-c++ libffi-devel openssl-devel && \
    yum clean all
COPY worker.py ${LAMBDA_TASK_ROOT}
CMD [ "worker.handler" ]
