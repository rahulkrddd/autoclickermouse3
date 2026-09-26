let discount=0,coupon='';function render(){let a=cart(),sub=a.reduce((s,x)=>s+x.price*x.quantity,0);$('#rows').innerHTML=a.map((x,i)=>`<div class="cartrow"><a href="/product/${x.slug||''}"><img src="${x.image}"></a><div><h3><a href="/product/${x.slug||''}">${x.name}</a></h3><p>₹${x.price}</p><select onchange="qty(${i},this.value)">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<option ${n===x.quantity?'selected':''}>${n}</option>`).join('')}</select></div><button class="pill danger" onclick="removeItem(${i})">Remove</button></div>`).join('')||'<div class="order">Your cart is empty.</div>';$('#sub').textContent=sub;$('#discount').textContent=discount;$('#total').textContent=Math.max(0,sub-discount);const tq=$('#totalQty');if(tq)tq.textContent=a.reduce((n,x)=>n+x.quantity,0);updateCount()}window.qty=(i,v)=>{let a=cart();a[i].quantity=+v;saveCart(a);discount=0;render()};window.removeItem=i=>{let a=cart(),p=a[i];a.splice(i,1);saveCart(a);track('cart_remove',{productId:p.id});discount=0;render()};$('#apply').onclick=async()=>{let r=await fetch('/api/coupon',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:$('#coupon').value,subtotal:+$('#sub').textContent})}),d=await r.json();


if(r.ok){

    discount = d.discount;
    coupon = d.code;

    render();

    const msg = document.getElementById('couponMsg');

    msg.className = 'coupon-message success';

    msg.innerHTML = `
        <span class="coupon-burst">✓</span>
        <span>
            <b>${d.code} Applied Successfully</b>
            <small>You saved ₹${d.discount}</small>
        </span>
    `;

    msg.animate(
        [
            { transform:'translateY(20px) scale(.9)', opacity:0 },
            { transform:'translateY(-4px) scale(1.03)', opacity:1 },
            { transform:'translateY(0) scale(1)', opacity:1 }
        ],
        {
            duration:700,
            easing:'cubic-bezier(.18,.89,.32,1.28)'
        }
    );
}

else{$('#couponMsg').className='coupon-message error';$('#couponMsg').textContent=d.message||'Invalid coupon or minimum order not met'}};$('#checkout').onclick=()=>{if(!cart().length)return toast('Your cart is empty');openDirectCheckout(cart().map(x=>({productId:x.id,quantity:x.quantity})),{}, {discount,coupon})};$('#checkoutModal .close').onclick=()=>{$('#checkoutModal').classList.remove('open');track('checkout_abandoned',{name:$('#name').value,mobile:$('#mobile').value})};$('#checkoutForm').onsubmit=async e=>{e.preventDefault();let customer={name:$('#name').value,mobile:$('#mobile').value,address:$('#address').value,pincode:$('#pincode').value},items=cart().map(x=>({productId:x.id,quantity:x.quantity})),r=await fetch('/createOrder',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items,discount,coupon,customer})}),o=await r.json();if(!r.ok)return alert(o.message);new Razorpay({key:o.key,amount:o.amount,currency:o.currency,order_id:o.id,name:'AutoClickerMouse',prefill:{name:customer.name,contact:customer.mobile},handler:async x=>{let z=await fetch('/verifyPayment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({payment_id:x.razorpay_payment_id,order_id:x.razorpay_order_id,signature:x.razorpay_signature})}),d=await z.json();if(d.success){saveCart([]);localStorage.setItem('mobileNumber',customer.mobile);alert('Payment successful. Order created.');location.href='/my-orders?mobileNumber='+customer.mobile}else alert('Verification failed')},modal:{ondismiss:()=>track('checkout_abandoned',{name:customer.name,mobile:customer.mobile,orderId:o.id})}}).open()};render();