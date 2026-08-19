export const makeTopicController = ({ generateTopics, approveTopic, rejectTopic }) => ({
  generate: (req) => generateTopics({ themeId: req.body.themeId, count: req.body.count }),
  approve: (req) => approveTopic({ topicId: req.params.id }),
  reject: (req) => rejectTopic({ topicId: req.params.id }),
});
