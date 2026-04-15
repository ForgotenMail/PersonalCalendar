class Event:
    fields = {
        "date", "name", "start_time", "end_time",
        "importance", "color", "owner", "reward"
    }

    def __init__(self, **kwargs):
        for field in self.fields:
            setattr(self, field, None)
        self.set(**kwargs)

    def set(self, **kwargs):
        for key, value in kwargs.items():
            if key not in self.fields:
                raise AttributeError(f"{key} is not valid")
            setattr(self, key, value)


def create_event(event_name, date, name, start_time, end_time, importance, color, owner, reward)
    global AllEvents
    AllEvents.append(event_name = Event(date, name, start_time, end_time, importance, color, owner, reward) 
    return event_name

def

