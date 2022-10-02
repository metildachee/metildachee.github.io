function getPipelineSequence() {
  let pipelineArrangement = Array.from(
    document.querySelectorAll("ul>li"),
    (li) => li.id
  );
  let pipelineIdx = pipelineArrangement.map(
    (pipeline) => FILTER_NAME_TO_ID_MAP[pipeline]
  );
  return pipelineIdx;
}

function initArr(size, initValue) {
  return Array(size).fill(initValue);
}
