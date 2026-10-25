from celery import Celery
from ..config import Settings
c=Settings()
celery=Celery('media_ops',broker=c.redis_url,include=['app.jobs.tasks'])
celery.conf.update(task_acks_late=True,worker_prefetch_multiplier=1,task_reject_on_worker_lost=True,broker_connection_retry_on_startup=True,broker_connection_timeout=3,broker_transport_options={'socket_timeout':3,'socket_connect_timeout':3,'visibility_timeout':3600},task_publish_retry=False,task_ignore_result=True,beat_schedule={'gmail':{'task':'media.sync_all','schedule':120},'reminders':{'task':'media.reminders','schedule':30},'retention':{'task':'media.retention','schedule':86400}})
