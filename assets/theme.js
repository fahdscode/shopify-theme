/**
 * Oppozite Wears - Theme JavaScript
 * Premium streetwear e-commerce functionality
 */

(function() {
  'use strict';

  // ==========================================================================
  // Utility Functions
  // ==========================================================================
  
  const Utils = {
    debounce(fn, delay) {
      let timeoutId;
      return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
      };
    },
    
    throttle(fn, limit) {
      let inThrottle;
      return function(...args) {
        if (!inThrottle) {
          fn.apply(this, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    },
    
    formatMoney(cents, format = '${{amount}}') {
      const value = (cents / 100).toFixed(2);
      return format.replace('{{amount}}', value);
    },
    
    serializeForm(form) {
      const formData = new FormData(form);
      const obj = {};
      formData.forEach((value, key) => obj[key] = value);
      return obj;
    },
    
    fetchConfig(type = 'json') {
      return {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': `application/${type}`
        }
      };
    }
  };

  // ==========================================================================
  // Cart Functionality
  // ==========================================================================
  
  const Cart = {
    drawer: null,
    overlay: null,
    itemsContainer: null,
    countElements: null,
    subtotalElement: null,
    
    init() {
      this.drawer = document.querySelector('[data-cart-drawer]');
      this.overlay = document.querySelector('[data-cart-overlay]');
      this.itemsContainer = document.querySelector('[data-cart-items]');
      this.countElements = document.querySelectorAll('[data-cart-count]');
      this.subtotalElement = document.querySelector('[data-cart-subtotal]');
      
      if (!this.drawer) return;
      
      this.bindEvents();
    },
    
    bindEvents() {
      // Open cart triggers
      document.querySelectorAll('[data-cart-trigger]').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
          e.preventDefault();
          this.open();
        });
      });
      
      // Close cart triggers
      document.querySelectorAll('[data-cart-close]').forEach(btn => {
        btn.addEventListener('click', () => this.close());
      });
      
      // Overlay click
      if (this.overlay) {
        this.overlay.addEventListener('click', () => this.close());
      }
      
      // Quantity changes
      document.addEventListener('click', (e) => {
        const quantityBtn = e.target.closest('[data-quantity-change]');
        if (quantityBtn) {
          e.preventDefault();
          const line = parseInt(quantityBtn.dataset.line);
          const quantity = parseInt(quantityBtn.dataset.quantity);
          this.updateQuantity(line, quantity);
        }
      });
      
      // Add to cart forms
      document.addEventListener('submit', (e) => {
        const form = e.target.closest('[data-add-to-cart-form]');
        if (form) {
          e.preventDefault();
          this.addToCart(form);
        }
      });
      
      // Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.drawer.classList.contains('is-open')) {
          this.close();
        }
      });
    },
    
    open() {
      this.drawer.classList.add('is-open');
      if (this.overlay) this.overlay.classList.add('is-active');
      document.body.style.overflow = 'hidden';
      this.drawer.setAttribute('aria-hidden', 'false');
    },
    
    close() {
      this.drawer.classList.remove('is-open');
      if (this.overlay) this.overlay.classList.remove('is-active');
      document.body.style.overflow = '';
      this.drawer.setAttribute('aria-hidden', 'true');
    },
    
    async addToCart(form) {
      const submitBtn = form.querySelector('[type="submit"]');
      const originalText = submitBtn?.innerHTML;
      
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Adding...';
      }
      
      try {
        const formData = new FormData(form);
        const response = await fetch('/cart/add.js', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error('Add to cart failed');
        }
        
        const item = await response.json();
        await this.refresh();
        this.open();
        
        // Show success feedback
        if (submitBtn) {
          submitBtn.innerHTML = '✓ Added!';
          setTimeout(() => {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
          }, 2000);
        }
        
      } catch (error) {
        console.error('Add to cart error:', error);
        if (submitBtn) {
          submitBtn.innerHTML = 'Error - Try Again';
          setTimeout(() => {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
          }, 2000);
        }
      }
    },
    
    async updateQuantity(line, quantity) {
      try {
        const response = await fetch('/cart/change.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            line: line,
            quantity: quantity
          })
        });
        
        if (!response.ok) {
          throw new Error('Update quantity failed');
        }
        
        await this.refresh();
        
      } catch (error) {
        console.error('Update quantity error:', error);
      }
    },
    
    async refresh() {
      try {
        const response = await fetch('/?section_id=cart-drawer');
        const html = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newDrawer = doc.querySelector('[data-cart-drawer]');
        
        if (newDrawer && this.drawer) {
          this.drawer.innerHTML = newDrawer.innerHTML;
        }
        
        // Update cart count
        const cartResponse = await fetch('/cart.js');
        const cart = await cartResponse.json();
        this.updateCount(cart.item_count);
        
      } catch (error) {
        console.error('Cart refresh error:', error);
      }
    },
    
    updateCount(count) {
      this.countElements.forEach(el => {
        el.textContent = `(${count})`;
        el.closest('[data-cart-trigger]')?.classList.toggle('has-items', count > 0);
      });
    }
  };

  // ==========================================================================
  // Header Functionality
  // ==========================================================================
  
  const Header = {
    header: null,
    lastScrollY: 0,
    
    init() {
      this.header = document.querySelector('.site-header');
      if (!this.header) return;
      
      this.bindEvents();
    },
    
    bindEvents() {
      // Scroll behavior
      window.addEventListener('scroll', Utils.throttle(() => {
        this.handleScroll();
      }, 100));
      
      // Mobile menu toggle
      const mobileToggle = document.querySelector('[data-mobile-menu-toggle]');
      const mobileMenu = document.querySelector('[data-mobile-menu]');
      
      if (mobileToggle && mobileMenu) {
        mobileToggle.addEventListener('click', () => {
          mobileMenu.classList.toggle('is-active');
          mobileToggle.classList.toggle('is-active');
          document.body.style.overflow = mobileMenu.classList.contains('is-active') ? 'hidden' : '';
        });
      }
      
      // Dropdown menus
      document.querySelectorAll('[data-dropdown-trigger]').forEach(trigger => {
        trigger.addEventListener('mouseenter', () => {
          trigger.closest('[data-dropdown]')?.classList.add('is-active');
        });
        
        trigger.closest('[data-dropdown]')?.addEventListener('mouseleave', () => {
          trigger.closest('[data-dropdown]')?.classList.remove('is-active');
        });
      });
    },
    
    handleScroll() {
      const currentScrollY = window.scrollY;
      
      // Add scrolled class
      this.header.classList.toggle('is-scrolled', currentScrollY > 50);
      
      // Hide/show on scroll direction
      if (currentScrollY > this.lastScrollY && currentScrollY > 200) {
        this.header.classList.add('is-hidden');
      } else {
        this.header.classList.remove('is-hidden');
      }
      
      this.lastScrollY = currentScrollY;
    }
  };

  // ==========================================================================
  // Product Gallery
  // ==========================================================================
  
  const ProductGallery = {
    init() {
      const galleries = document.querySelectorAll('[data-product-gallery]');
      galleries.forEach(gallery => this.initGallery(gallery));
    },
    
    initGallery(gallery) {
      const mainImage = gallery.querySelector('[data-main-image]');
      const thumbnails = gallery.querySelectorAll('[data-thumbnail]');
      
      if (!mainImage || !thumbnails.length) return;
      
      thumbnails.forEach(thumb => {
        thumb.addEventListener('click', () => {
          // Update main image
          mainImage.src = thumb.dataset.fullImage || thumb.src.replace(/width=\d+/, 'width=800');
          mainImage.srcset = '';
          
          // Update active state
          thumbnails.forEach(t => t.classList.remove('is-active'));
          thumb.classList.add('is-active');
        });
      });
    }
  };

  // ==========================================================================
  // Variant Selector
  // ==========================================================================
  
  const VariantSelector = {
    init() {
      const selectors = document.querySelectorAll('[data-variant-selector]');
      selectors.forEach(selector => this.initSelector(selector));
    },
    
    initSelector(container) {
      const productJson = container.querySelector('[data-product-json]');
      if (!productJson) return;
      
      const product = JSON.parse(productJson.textContent);
      const options = container.querySelectorAll('[data-option-input]');
      const variantIdInput = container.querySelector('[name="id"]');
      const priceElement = container.querySelector('[data-product-price]');
      const addToCartBtn = container.querySelector('[data-add-to-cart]');
      
      options.forEach(option => {
        option.addEventListener('change', () => {
          const selectedOptions = Array.from(options)
            .filter(o => o.checked || o.tagName === 'SELECT')
            .map(o => o.value);
          
          const variant = this.findVariant(product.variants, selectedOptions);
          
          if (variant) {
            this.updateVariant(variant, variantIdInput, priceElement, addToCartBtn);
          }
        });
      });
    },
    
    findVariant(variants, selectedOptions) {
      return variants.find(variant => {
        return selectedOptions.every((option, index) => {
          return variant[`option${index + 1}`] === option;
        });
      });
    },
    
    updateVariant(variant, variantIdInput, priceElement, addToCartBtn) {
      // Update hidden input
      if (variantIdInput) {
        variantIdInput.value = variant.id;
      }
      
      // Update price
      if (priceElement) {
        priceElement.innerHTML = Utils.formatMoney(variant.price);
        
        if (variant.compare_at_price && variant.compare_at_price > variant.price) {
          priceElement.innerHTML += `<span class="price--compare">${Utils.formatMoney(variant.compare_at_price)}</span>`;
        }
      }
      
      // Update button state
      if (addToCartBtn) {
        if (variant.available) {
          addToCartBtn.disabled = false;
          addToCartBtn.textContent = 'Add to Cart';
        } else {
          addToCartBtn.disabled = true;
          addToCartBtn.textContent = 'Sold Out';
        }
      }
      
      // Update URL
      const url = new URL(window.location);
      url.searchParams.set('variant', variant.id);
      window.history.replaceState({}, '', url);
    }
  };

  // ==========================================================================
  // Animations
  // ==========================================================================
  
  const Animations = {
    init() {
      this.initScrollAnimations();
      this.initMagneticCursor();
      this.initParallax();
    },
    
    initScrollAnimations() {
      const elements = document.querySelectorAll('[data-animate]');
      
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              observer.unobserve(entry.target);
            }
          });
        }, {
          threshold: 0.1,
          rootMargin: '0px 0px -50px 0px'
        });
        
        elements.forEach(el => observer.observe(el));
      } else {
        elements.forEach(el => el.classList.add('is-visible'));
      }
    },
    
    initMagneticCursor() {
      const magneticElements = document.querySelectorAll('[data-magnetic]');
      
      magneticElements.forEach(el => {
        el.addEventListener('mousemove', (e) => {
          const rect = el.getBoundingClientRect();
          const x = e.clientX - rect.left - rect.width / 2;
          const y = e.clientY - rect.top - rect.height / 2;
          
          el.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
        });
        
        el.addEventListener('mouseleave', () => {
          el.style.transform = '';
        });
      });
    },
    
    initParallax() {
      const parallaxElements = document.querySelectorAll('[data-parallax]');
      
      if (!parallaxElements.length) return;
      
      window.addEventListener('scroll', Utils.throttle(() => {
        parallaxElements.forEach(el => {
          const speed = parseFloat(el.dataset.parallax) || 0.5;
          const rect = el.getBoundingClientRect();
          const scrolled = window.scrollY;
          const offset = (rect.top + scrolled - window.innerHeight) * speed;
          
          el.style.transform = `translateY(${offset}px)`;
        });
      }, 16));
    }
  };

  // ==========================================================================
  // Newsletter Form
  // ==========================================================================
  
  const Newsletter = {
    init() {
      const forms = document.querySelectorAll('[data-newsletter-form]');
      forms.forEach(form => this.initForm(form));
    },
    
    initForm(form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = form.querySelector('input[type="email"]').value;
        const submitBtn = form.querySelector('button[type="submit"]');
        const messageEl = form.querySelector('[data-newsletter-message]');
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Subscribing...';
        
        try {
          const response = await fetch('/contact#contact_form', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
              'form_type': 'customer',
              'utf8': '✓',
              'contact[email]': email,
              'contact[tags]': 'newsletter'
            })
          });
          
          if (messageEl) {
            messageEl.textContent = 'Thank you for subscribing!';
            messageEl.classList.add('success');
          }
          
          form.reset();
          
        } catch (error) {
          if (messageEl) {
            messageEl.textContent = 'Something went wrong. Please try again.';
            messageEl.classList.add('error');
          }
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Subscribe';
        }
      });
    }
  };

  // ==========================================================================
  // Quantity Selector
  // ==========================================================================
  
  const QuantitySelector = {
    init() {
      document.addEventListener('click', (e) => {
        const decreaseBtn = e.target.closest('[data-quantity-decrease]');
        const increaseBtn = e.target.closest('[data-quantity-increase]');
        
        if (decreaseBtn || increaseBtn) {
          const wrapper = (decreaseBtn || increaseBtn).closest('[data-quantity-wrapper]');
          const input = wrapper?.querySelector('[data-quantity-input]');
          
          if (input) {
            const currentValue = parseInt(input.value) || 1;
            const min = parseInt(input.min) || 1;
            const max = parseInt(input.max) || 99;
            
            if (decreaseBtn && currentValue > min) {
              input.value = currentValue - 1;
            } else if (increaseBtn && currentValue < max) {
              input.value = currentValue + 1;
            }
            
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      });
    }
  };

  // ==========================================================================
  // Accordion
  // ==========================================================================
  
  const Accordion = {
    init() {
      document.querySelectorAll('[data-accordion]').forEach(accordion => {
        const triggers = accordion.querySelectorAll('[data-accordion-trigger]');
        
        triggers.forEach(trigger => {
          trigger.addEventListener('click', () => {
            const item = trigger.closest('[data-accordion-item]');
            const content = item?.querySelector('[data-accordion-content]');
            const isOpen = item?.classList.contains('is-open');
            
            // Close all items in this accordion
            if (accordion.dataset.accordionSingle !== 'false') {
              accordion.querySelectorAll('[data-accordion-item]').forEach(i => {
                i.classList.remove('is-open');
                i.querySelector('[data-accordion-content]').style.maxHeight = '0';
              });
            }
            
            // Toggle current item
            if (!isOpen && content) {
              item.classList.add('is-open');
              content.style.maxHeight = content.scrollHeight + 'px';
            }
          });
        });
      });
    }
  };

  // ==========================================================================
  // Initialize
  // ==========================================================================
  
  document.addEventListener('DOMContentLoaded', () => {
    Cart.init();
    Header.init();
    ProductGallery.init();
    VariantSelector.init();
    Animations.init();
    Newsletter.init();
    QuantitySelector.init();
    Accordion.init();
    
    console.log('Oppozite Theme initialized');
  });

  // Expose for external use
  window.OppoziteTheme = {
    Cart,
    Utils,
    Header,
    ProductGallery,
    VariantSelector
  };

})();
