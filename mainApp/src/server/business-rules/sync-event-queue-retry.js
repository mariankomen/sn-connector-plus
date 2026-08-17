(function executeRule(current, previous) {
    if (!current) {
        return;
    }

    var queueService = new x_1955226_peeklo_1.SyncEventQueueService();
    queueService.processRetry(current);
})(current, previous);

