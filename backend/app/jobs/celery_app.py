from celery import Celery
from ..config import Settings
c=Settings()
celery=Celery('media_ops',broker=c.redis_url,include=['app.jobs.tasks'])
celery.conf.update(task_acks_late=True,worker_prefetch_multiplier=1,task_reject_on_worker_lost=True,broker_connection_retry_on_startup=True,beat_schedule={'gmail':{'task':'media.sync_all','schedule':120},'reminders':{'task':'media.reminders','schedule':30},'retention':{'task':'media.retention','schedule':86400}})
