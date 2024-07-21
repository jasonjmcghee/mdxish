# When building interactive blogs...

## The Intersection Observer
When possible, only start work (animations etc.) when you need to and stop them when you don't!

For example:

```javascript
let shouldDoWork = false;

function animate() {
  if (!shouldDoWork) return
  
  // Animation code goes here...
  
  requestAnimationFrame(animate);
}

const observer = new IntersectionObserver((entries) => {
  const visible = entries[0].isIntersecting === true;
  if (!shouldDoWork && visible) {
    shouldDoWork = true;
    requestAnimationFrame(animate);
  } else if (shouldDoWork && !visible) {
    shouldDoWork = false;
  }
});

observer.observe(document.querySelector("#expensiveAnimation"));
```