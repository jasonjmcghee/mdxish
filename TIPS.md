# When building interactive blogs...

## Custom Hot Reload Behavior

There's a feature in mdxish where you can override what happens when you update a file when running the `server`. Just set `window.mdxishState.onReload`.

Here's an example of how you might override the `onReload` function. Instead of the standard behavior (calling `window.location.reload()`), we create an `iframe` that gets the `html` that just rendered due to our file change. Then, we render that (invisibly), select the nodes we're interested in (in this case, specifically certain threejs materials with fragment shaders) and then we update our non-iframe / current window with the shader.

And just like that, we have hot-reloading fragment shaders without reloading the page, or resetting / touching any other state, like painted images on the canvas.

```javascript
window.mdxishState.onReload = (event) => {
  document.querySelectorAll("iframe").forEach((o) => {
    o.parentNode.removeChild(o);
  });
  const iframe = document.createElement('iframe');
  iframe.style.display = "none";
  document.body.appendChild(iframe);
  const htmlContent = event.html;
  iframe.srcdoc = htmlContent;
  iframe.onload = () => {
    const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
    const shaders = Object.keys(iframe.contentWindow[instance]).filter((a) => a.toLowerCase().includes("plane")).forEach((p) => {
      if (iframe.contentWindow[instance][p]?.material) {
        const shader = iframe.contentWindow[instance][p].material.fragmentShader;
        self[p].material.fragmentShader = shader;
        self[p].material.needsUpdate = true;
      }
    });

    self.renderPass();
    document.querySelectorAll("iframe").forEach((o) => {
      o.parentNode.removeChild(o);
    });
  };
  return false;
};
```


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
