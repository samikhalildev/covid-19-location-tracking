export const TimeAgo = (function() {
    var self = {};
    
    // Public Methods
    self.locales = {
      prefix: '',
      
      seconds: 'less than a minute',
      minute:  'approximately a minute',
      minutes: '%d minutes',
      hour:    'approximately an hour',
      hours:   'approximately %d hours',
      day:     'a day',
      days:    '%d days',
      month:   'approximately a month',
      months:  '%d months',
      year:    'approximately a year',
      years:   '%d years'
    };
    
    self.inWords = function(t1,t2) {
      var seconds = Math.floor((t1 - t2) / 1000),
          separator = this.locales.separator || ' ',
          words = this.locales.prefix + separator,
          interval = 0,
          intervals = {
            year:   seconds / 31536000,
            month:  seconds / 2592000,
            day:    seconds / 86400,
            hour:   seconds / 3600,
            minute: seconds / 60
          };
      
      var distance = this.locales.seconds;
      
      for (var key in intervals) {
        interval = Math.floor(intervals[key]);
        
        if (interval > 1) {
          distance = this.locales[key + 's'];
          break;
        } else if (interval === 1) {
          distance = this.locales[key];
          break;
        }
      }
      
      distance = distance.replace(/%d/i, interval);
      words += 'You were here for ' + distance + separator;
  
      return words.trim();
    };
    
    return self;
  }());

