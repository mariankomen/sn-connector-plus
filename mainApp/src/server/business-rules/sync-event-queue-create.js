(function executeRule(current, previous) {
    if (!current) {
        return;
    }

    var queueService = new x_peekl_salesfor_0.SyncEventQueueService();
    queueService.processCreate(current);
})(current, previous);

