# Plan — ml-in-practice/11-mlops-infrastructure-and-orchestration (systems flex)
DAG executor+retries, M/M/1 queue, fair-share scheduler. Retrofit: intuition + 2 validations + gotchas + key takeaways.
Validation: Retries raise end-to-end success; wait explodes near rho=1. Gotcha demo: topo_sort valid order vs cycle raises ValueError (topo_sort returns (order,children)).
