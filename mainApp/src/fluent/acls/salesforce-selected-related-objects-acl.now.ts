import '@servicenow/sdk/global'
import { Acl } from '@servicenow/sdk/core'
import { salesforceIntegrationUserPaidRole } from '../security/roles.now'

const aclRoles = [salesforceIntegrationUserPaidRole]

Acl({ $id: Now.ID['salesforce_connection_create_acl'], type: 'record', table: 'x_peekl_salesfor_0_salesforce_connection', operation: 'create', roles: aclRoles })
Acl({ $id: Now.ID['salesforce_connection_read_acl'], type: 'record', table: 'x_peekl_salesfor_0_salesforce_connection', operation: 'read', roles: aclRoles })
Acl({ $id: Now.ID['salesforce_connection_write_acl'], type: 'record', table: 'x_peekl_salesfor_0_salesforce_connection', operation: 'write', roles: aclRoles })
Acl({ $id: Now.ID['salesforce_connection_delete_acl'], type: 'record', table: 'x_peekl_salesfor_0_salesforce_connection', operation: 'delete', roles: aclRoles })

Acl({ $id: Now.ID['salesforce_object_config_create_acl'], type: 'record', table: 'x_peekl_salesfor_0_salesforce_object_config', operation: 'create', roles: aclRoles })
Acl({ $id: Now.ID['salesforce_object_config_read_acl'], type: 'record', table: 'x_peekl_salesfor_0_salesforce_object_config', operation: 'read', roles: aclRoles })
Acl({ $id: Now.ID['salesforce_object_config_write_acl'], type: 'record', table: 'x_peekl_salesfor_0_salesforce_object_config', operation: 'write', roles: aclRoles })
Acl({ $id: Now.ID['salesforce_object_config_delete_acl'], type: 'record', table: 'x_peekl_salesfor_0_salesforce_object_config', operation: 'delete', roles: aclRoles })

Acl({ $id: Now.ID['sync_config_create_acl'], type: 'record', table: 'x_peekl_salesfor_0_sync_config', operation: 'create', roles: aclRoles })
Acl({ $id: Now.ID['sync_config_read_acl'], type: 'record', table: 'x_peekl_salesfor_0_sync_config', operation: 'read', roles: aclRoles })
Acl({ $id: Now.ID['sync_config_write_acl'], type: 'record', table: 'x_peekl_salesfor_0_sync_config', operation: 'write', roles: aclRoles })
Acl({ $id: Now.ID['sync_config_delete_acl'], type: 'record', table: 'x_peekl_salesfor_0_sync_config', operation: 'delete', roles: aclRoles })

Acl({ $id: Now.ID['sync_event_queue_create_acl'], type: 'record', table: 'x_peekl_salesfor_0_sync_event_queue', operation: 'create', roles: aclRoles })
Acl({ $id: Now.ID['sync_event_queue_read_acl'], type: 'record', table: 'x_peekl_salesfor_0_sync_event_queue', operation: 'read', roles: aclRoles })
Acl({ $id: Now.ID['sync_event_queue_write_acl'], type: 'record', table: 'x_peekl_salesfor_0_sync_event_queue', operation: 'write', roles: aclRoles })
Acl({ $id: Now.ID['sync_event_queue_delete_acl'], type: 'record', table: 'x_peekl_salesfor_0_sync_event_queue', operation: 'delete', roles: aclRoles })

Acl({ $id: Now.ID['salesforce_object_columns_create_acl'], type: 'record', table: 'x_peekl_salesfor_0_salesforce_object_columns', operation: 'create', roles: aclRoles })
Acl({ $id: Now.ID['salesforce_object_columns_read_acl'], type: 'record', table: 'x_peekl_salesfor_0_salesforce_object_columns', operation: 'read', roles: aclRoles })
Acl({ $id: Now.ID['salesforce_object_columns_write_acl'], type: 'record', table: 'x_peekl_salesfor_0_salesforce_object_columns', operation: 'write', roles: aclRoles })
Acl({ $id: Now.ID['salesforce_object_columns_delete_acl'], type: 'record', table: 'x_peekl_salesfor_0_salesforce_object_columns', operation: 'delete', roles: aclRoles })

Acl({ $id: Now.ID['salesforce_selected_related_objects_create_acl'], type: 'record', table: 'x_peekl_salesfor_0_salesforce_selected_related_objects', operation: 'create', roles: aclRoles })
Acl({ $id: Now.ID['salesforce_selected_related_objects_read_acl'], type: 'record', table: 'x_peekl_salesfor_0_salesforce_selected_related_objects', operation: 'read', roles: aclRoles })
Acl({ $id: Now.ID['salesforce_selected_related_objects_write_acl'], type: 'record', table: 'x_peekl_salesfor_0_salesforce_selected_related_objects', operation: 'write', roles: aclRoles })
Acl({ $id: Now.ID['salesforce_selected_related_objects_delete_acl'], type: 'record', table: 'x_peekl_salesfor_0_salesforce_selected_related_objects', operation: 'delete', roles: aclRoles })

Acl({ $id: Now.ID['salesforce_related_object_columns_create_acl'], type: 'record', table: 'x_peekl_salesfor_0_salesforce_related_object_columns', operation: 'create', roles: aclRoles })
Acl({ $id: Now.ID['salesforce_related_object_columns_read_acl'], type: 'record', table: 'x_peekl_salesfor_0_salesforce_related_object_columns', operation: 'read', roles: aclRoles })
Acl({ $id: Now.ID['salesforce_related_object_columns_write_acl'], type: 'record', table: 'x_peekl_salesfor_0_salesforce_related_object_columns', operation: 'write', roles: aclRoles })
Acl({ $id: Now.ID['salesforce_related_object_columns_delete_acl'], type: 'record', table: 'x_peekl_salesfor_0_salesforce_related_object_columns', operation: 'delete', roles: aclRoles })

Acl({ $id: Now.ID['task_type_config_create_acl'], type: 'record', table: 'x_peekl_salesfor_0_task_type_config', operation: 'create', roles: aclRoles })
Acl({ $id: Now.ID['task_type_config_read_acl'], type: 'record', table: 'x_peekl_salesfor_0_task_type_config', operation: 'read', roles: aclRoles })
Acl({ $id: Now.ID['task_type_config_write_acl'], type: 'record', table: 'x_peekl_salesfor_0_task_type_config', operation: 'write', roles: aclRoles })
Acl({ $id: Now.ID['task_type_config_delete_acl'], type: 'record', table: 'x_peekl_salesfor_0_task_type_config', operation: 'delete', roles: aclRoles })
