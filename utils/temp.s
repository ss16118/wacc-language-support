.data

singleton_0:
    .word 4
    .ascii "%s\n\0"
singleton_1:
    .word 2
    .ascii "%d\0"
singleton_2:
    .word 4
    .ascii "%d\n\0"
msg_0:
    .word 24
    .ascii "enter an integer to echo\0"
.text

.global main
main:
    PUSH {lr}
    SUB sp, sp, #4
    MOV r4, #1
    STR r4, [sp]
    LDR r4, =msg_0
    MOV r1, r4
    ADD r1, r1, #4
    LDR r0, =singleton_0
    ADD r0, r0, #4
    BL printf
    MOV r0, #0
    BL fflush
    ADD r1, sp, #0
    LDR r0, =singleton_1
    ADD r0, r0, #4
    BL scanf
    LDR r4, [sp]
    MOV r1, r4
    LDR r0, =singleton_2
    ADD r0, r0, #4
    BL printf
    MOV r0, #0
    BL fflush
    ADD sp, sp, #4
    MOV r0, #0
    POP {pc}
    .ltorg
